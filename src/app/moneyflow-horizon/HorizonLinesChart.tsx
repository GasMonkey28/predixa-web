'use client'

import { useEffect, useRef, useState } from 'react'

type OhlcBar = { date: string; open: number | null; high: number | null; low: number | null; close: number | null }
type Prediction = {
  origin_date: string
  pred_close_price: number
  pred_high_price?: number
  pred_low_price?: number
  is_pending?: boolean
  /** origin_date + N trading days -- the day this prediction is actually
   *  forecasting. Only populated once that day has resolved; null for
   *  still-pending (future) forecasts. */
  target_date?: string | null
}
type HorizonDataset = { predictions: Prediction[]; ohlc: OhlcBar[] }
type HistoryPayload = Record<string, HorizonDataset>

// From the y2y3 model chart (/api/model2/daily) -- reused here for the same
// no-signal-down-day star / open-price recovery line / long-short signal
// marker overlay that Model2Chart.tsx draws, so the two charts read the same
// way at a glance.
type Y2Y3Day = {
  as_of_date: string
  open_price: number | null
  high_price: number | null
  low_price: number | null
  close_price: number | null
  final_signal?: string | null
  position_size?: number | null
}

function isNoSignalDownDay(d: Y2Y3Day): boolean {
  const signal = d.final_signal
  if (signal && signal !== 'no_trade') return false
  if (d.open_price == null || d.close_price == null) return false
  return d.close_price < d.open_price
}

function findOpenPriceTouchIndex(days: Y2Y3Day[], startIndex: number, openPrice: number): number | null {
  for (let j = startIndex + 1; j < days.length; j++) {
    const day = days[j]
    if (day.low_price != null && day.high_price != null && day.low_price <= openPrice && openPrice <= day.high_price) {
      return j
    }
  }
  return null
}

function starSvg(x: number, y: number, recovered: boolean, id: string): string {
  const base = `x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="13"`
  if (!recovered) {
    return `<text ${base} fill="#fbbf24" stroke="#92400e" stroke-width="0.4">★</text>`
  }
  const clipId = `mfh-half-star-${id}`
  return (
    `<g><defs><clipPath id="${clipId}"><rect x="${(x - 7).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="7" height="14"/></clipPath></defs>` +
    `<text ${base} fill="none" stroke="#fbbf24" stroke-width="1">★</text>` +
    `<text ${base} fill="#fbbf24" stroke="#92400e" stroke-width="0.4" clip-path="url(#${clipId})">★</text></g>`
  )
}

const SERIES = [
  { key: '1d', label: '1-day', color: 'var(--mfh-series-1)' },
  { key: '5d', label: '5-day', color: 'var(--mfh-series-2)' },
  { key: '10d', label: '10-day', color: 'var(--mfh-series-3)' },
  { key: '15d', label: '15-day', color: 'var(--mfh-series-4)' },
  { key: '20d', label: '20-day', color: 'var(--mfh-series-5)' },
] as const

const HORIZON_DAYS: Record<string, number> = { '1d': 1, '5d': 5, '10d': 10, '15d': 15, '20d': 20 }

// Approximate a target date for a still-pending prediction (no resolved
// target_date yet) by walking forward N trading days (weekends skipped,
// market holidays not accounted for -- close enough for a visual toggle on
// forecasts that are inherently unresolved anyway).
function addTradingDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

const M = { top: 16, right: 58, bottom: 56, left: 58 }

export default function HorizonLinesChart({
  symbol = 'SPY',
  height = 420,
  barWidth = 5.5,
}: {
  symbol?: string
  height?: number
  barWidth?: number
}) {
  const HH = height
  const [data, setData] = useState<HistoryPayload | null>(null)
  const [error, setError] = useState(false)
  const [y2y3Days, setY2y3Days] = useState<Y2Y3Day[] | null>(null)
  // TradingView-style axis zoom: drag the x-axis left/right to widen/narrow
  // candles, drag the y-axis up/down to rescale price. Reset whenever the
  // ticker changes so switching symbols doesn't carry over a weird zoom.
  const [barW, setBarW] = useState(barWidth)
  const [yZoom, setYZoom] = useState(1)
  // Dollar offset applied on top of the auto-fit price window -- lets you
  // pan vertically (drag inside the plot) to look above/below what's
  // currently auto-fit without changing how zoomed in you are.
  const [yPanOffset, setYPanOffset] = useState(0)
  // An in-progress drag's rAF loop + window listeners live in here so they
  // survive the redraw effect rerunning mid-drag (every zoom tick changes
  // barW/yZoom, which reruns that effect) -- only real teardown (unmount or
  // ticker switch) should stop a drag, not the chart simply redrawing itself.
  const activeDragRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    activeDragRef.current?.()
    setBarW(barWidth)
    setYZoom(1)
    setYPanOffset(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])
  useEffect(() => () => activeDragRef.current?.(), [])
  const BAR_W = barW
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef<Record<string, boolean>>({ '1d': false, '5d': false, '10d': true, '15d': false, '20d': true })
  // Off (default): each line is plotted at the day the forecast was MADE
  // (origin_date). On: shifted forward by its own horizon so it's plotted at
  // the day it's actually forecasting (target_date) -- lets you read a
  // prediction's line directly against the candle it was trying to call.
  // Deliberately not reset on ticker switch, like the series toggles above.
  const [shiftToTarget, setShiftToTarget] = useState(false)
  // Off (default): only the pred_close center line is drawn. On: a shaded
  // band between pred_low_price/pred_high_price is drawn behind each
  // currently-visible series' line too. Not reset on ticker switch.
  const [showBand, setShowBand] = useState(false)
  const isDraggingAxisRef = useRef(false)
  const lastDataRef = useRef<HistoryPayload | null>(null)
  const [, forceRerender] = useState(0)
  // The price axis auto-fits whatever's currently scrolled into view, so a
  // plain scroll (trackpad, scrollbar, or the plot-drag pan) needs to trigger
  // a re-fit too -- not just zoom ticks, which are the only thing the main
  // draw effect otherwise reacts to.
  const [scrollTick, setScrollTick] = useState(0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setScrollTick((t) => t + 1)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [data])

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(false)
    fetch(`/api/moneyflow-horizon/history?ticker=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d?.status === 'missing' || d?.status === 'error') setError(true)
        else setData(d)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [symbol])

  // y2y3 model overlay: no-signal-down-day stars, open-price recovery lines,
  // long/short signal markers -- same read as Model2Chart.tsx's Price Chart.
  useEffect(() => {
    let cancelled = false
    setY2y3Days(null)
    fetch(`/api/model2/daily?ticker=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setY2y3Days(Array.isArray(d?.trading_days) ? d.trading_days : [])
      })
      .catch(() => {
        if (!cancelled) setY2y3Days([])
      })
    return () => {
      cancelled = true
    }
  }, [symbol])

  useEffect(() => {
    if (!data || !svgRef.current) return
    const svg = svgRef.current
    const tooltip = tooltipRef.current!
    const wrap = wrapRef.current!

    // This effect also reruns on every zoom drag tick (barW/yZoom changed).
    // On a genuinely new dataset, snap to the most recent candles like
    // before; on a zoom tick, preserve the current scroll position (as a
    // fraction of scrollable width) instead of yanking the view back right.
    const isNewData = lastDataRef.current !== data
    lastDataRef.current = data
    const scrollEl = scrollRef.current
    const prevMaxScroll = scrollEl ? scrollEl.scrollWidth - scrollEl.clientWidth : 0
    const prevScrollRatio = scrollEl && prevMaxScroll > 0 ? scrollEl.scrollLeft / prevMaxScroll : 1

    const seriesData = SERIES.map((s) => ({ ...s, data: data[s.key] })).filter((s) => s.data)
    if (!seriesData.length) return

    let anchorBars: OhlcBar[] = seriesData[0].data.ohlc
    seriesData.forEach((s) => {
      if (s.data.ohlc.length > anchorBars.length) anchorBars = s.data.ohlc
    })
    const bars = anchorBars.filter((d) => d.close !== null && d.open !== null)
    const dateIdx: Record<string, number> = {}
    bars.forEach((b, i) => {
      dateIdx[b.date] = i
    })

    // When shifted, a prediction is plotted at the day it's FORECASTING
    // rather than the day it was made: the resolved target_date if known,
    // else an approximated one for still-pending forecasts.
    const displayDateFor = (seriesKey: string, p: Prediction): string => {
      if (!shiftToTarget) return p.origin_date
      return p.target_date || addTradingDays(p.origin_date, HORIZON_DAYS[seriesKey] ?? 0)
    }

    // A forecast can exist for a day that has no candle yet (today, still in
    // progress, or -- when shifted -- a future day the target hasn't reached
    // yet) -- give those dates their own trailing x-axis slot instead of
    // silently dropping them.
    const lastBarDate = bars.length ? bars[bars.length - 1].date : ''
    const extraDateSet = new Set<string>()
    seriesData.forEach((s) => {
      s.data.predictions.forEach((p) => {
        const d = displayDateFor(s.key, p)
        if (dateIdx[d] === undefined && d > lastBarDate) extraDateSet.add(d)
      })
    })
    const extraDates = Array.from(extraDateSet).sort()
    extraDates.forEach((d, j) => {
      dateIdx[d] = bars.length + j
    })
    const totalSlots = bars.length + extraDates.length

    const byDate = seriesData.map((s) => {
      const map: Record<string, { predClose: number; predHigh?: number; predLow?: number; pending: boolean }> = {}
      s.data.predictions.forEach((p) => {
        const d = displayDateFor(s.key, p)
        if (dateIdx[d] === undefined) return
        map[d] = { predClose: p.pred_close_price, predHigh: p.pred_high_price, predLow: p.pred_low_price, pending: !!p.is_pending }
      })
      return { ...s, byDate: map }
    })

    const plotH = HH - M.top - M.bottom
    const clientW = scrollEl?.clientWidth ?? 0
    // Extra blank space past the last candle -- TradingView-style "room for
    // the future" -- so the chart isn't hard-stuck with the latest candle
    // glued to the right edge; dragging left can pull it away from the edge
    // into that empty margin. Sized off the viewport so it scales sensibly
    // at any zoom level: up to half a screen of empty space max, and a small
    // comfortable gap by default (not the full empty area right away).
    const futurePadPx = Math.max(BAR_W * 8, clientW * 0.5)
    const defaultRightMarginPx = Math.min(futurePadPx, BAR_W * 10)
    const W = M.left + M.right + totalSlots * BAR_W + futurePadPx
    const xCenter = (i: number) => M.left + (i + 0.5) * BAR_W
    const lastCandleEdgePx = M.left + totalSlots * BAR_W
    const defaultScrollLeft = Math.max(0, lastCandleEdgePx - clientW + defaultRightMarginPx)

    // Auto-fit the price axis to whichever candles are actually scrolled
    // into view (not the entire multi-year history, and not the empty
    // future margin) -- otherwise the price scale, and what a zoom drag
    // centers on, has no relationship to the bars on screen. Figure out the
    // visible index range from where the scroll position is about to land
    // (see the ratio-preserving restore below) rather than the stale
    // pre-render scrollLeft.
    let viewStartPx: number
    if (isNewData || !scrollEl || prevMaxScroll <= 0) {
      viewStartPx = defaultScrollLeft
    } else {
      const newMaxScroll = Math.max(0, W - clientW)
      viewStartPx = prevScrollRatio * newMaxScroll
    }
    const viewEndPx = viewStartPx + clientW
    const firstVisibleIdx = Math.max(0, Math.floor((viewStartPx - M.left) / BAR_W))
    const lastVisibleIdx = Math.min(totalSlots - 1, Math.ceil((viewEndPx - M.left) / BAR_W))

    const allPrices: number[] = []
    bars.forEach((b, i) => {
      if (i < firstVisibleIdx || i > lastVisibleIdx) return
      if (b.high != null) allPrices.push(b.high)
      if (b.low != null) allPrices.push(b.low)
    })
    byDate.forEach((s) =>
      Object.entries(s.byDate).forEach(([date, v]) => {
        const i = dateIdx[date]
        if (i === undefined || i < firstVisibleIdx || i > lastVisibleIdx) return
        allPrices.push(v.predClose)
        if (showBand && visibleRef.current[s.key]) {
          if (v.predHigh != null) allPrices.push(v.predHigh)
          if (v.predLow != null) allPrices.push(v.predLow)
        }
      })
    )
    // Nothing landed in view (e.g. viewport wider than data) -- fall back to
    // the full range rather than an empty/NaN scale.
    if (!allPrices.length) {
      bars.forEach((b) => {
        if (b.high != null) allPrices.push(b.high)
        if (b.low != null) allPrices.push(b.low)
      })
    }
    const yMinBase = Math.min(...allPrices) * 0.99
    const yMaxBase = Math.max(...allPrices) * 1.01
    const yCenter = (yMinBase + yMaxBase) / 2 + yPanOffset
    const yHalfSpan = ((yMaxBase - yMinBase) / 2) * yZoom
    const yMin = yCenter - yHalfSpan
    const yMax = yCenter + yHalfSpan

    const xLeft = (i: number) => M.left + i * BAR_W
    const yScale = (v: number) => M.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH

    // Price labels float at the CURRENT viewport's edges (not the data's
    // absolute left/right) so they track along as you scroll/drag and stay
    // visible no matter how far into the empty future margin you go --
    // pinning them to the data's edges meant they were only ever on screen
    // at one specific scroll extreme. A background pill keeps them readable
    // over candles/gridlines now that they float over the plot instead of
    // sitting in a dedicated margin.
    let gridSvg = ''
    let yLabelsSvg = ''
    for (let i = 0; i <= 5; i++) {
      const v = yMin + (yMax - yMin) * (i / 5)
      const y = yScale(v)
      gridSvg += `<line class="mfh-grid" x1="${M.left}" x2="${W - M.right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`
      const label = `$${Math.round(v)}`
      const pillW = label.length * 6.2 + 8
      const leftPillX = viewStartPx + 4
      const rightPillX = viewEndPx - 4 - pillW
      yLabelsSvg += `<rect class="mfh-axis-label-bg" x="${leftPillX.toFixed(1)}" y="${(y - 7).toFixed(1)}" width="${pillW.toFixed(1)}" height="14" rx="2"/>`
      yLabelsSvg += `<text class="mfh-axis-label" x="${(leftPillX + 4).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="start">${label}</text>`
      yLabelsSvg += `<rect class="mfh-axis-label-bg" x="${rightPillX.toFixed(1)}" y="${(y - 7).toFixed(1)}" width="${pillW.toFixed(1)}" height="14" rx="2"/>`
      yLabelsSvg += `<text class="mfh-axis-label" x="${(rightPillX + pillW - 4).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end">${label}</text>`
    }

    const allDates = bars.map((b) => b.date).concat(extraDates)

    let xLabelsSvg = ''
    const xLabelEvery = Math.ceil(totalSlots / 10) || 1
    allDates.forEach((date, i) => {
      if (i % xLabelEvery === 0) {
        const d = new Date(date + 'T00:00:00')
        xLabelsSvg += `<text class="mfh-axis-label" x="${xCenter(i).toFixed(1)}" y="${HH - M.bottom + 16}" text-anchor="middle">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>`
      }
    })

    let candlesSvg = ''
    bars.forEach((b, i) => {
      const x = xCenter(i)
      const up = (b.close as number) >= (b.open as number)
      const bodyTop = yScale(Math.max(b.open as number, b.close as number))
      const bodyBot = yScale(Math.min(b.open as number, b.close as number))
      const bodyW = BAR_W * 0.55
      const fill = up ? '#10b981' : '#ef4444'
      const stroke = up ? '#059669' : '#dc2626'
      if (b.high != null && b.low != null) {
        candlesSvg += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${yScale(b.high).toFixed(1)}" y2="${yScale(b.low).toFixed(1)}" stroke="${stroke}" stroke-width="1"/>`
      }
      candlesSvg += `<rect x="${(x - bodyW / 2).toFixed(1)}" y="${bodyTop.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${Math.max(1, bodyBot - bodyTop).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`
    })

    // y2y3 model overlay -- only covers whatever recent days the y2y3 chart
    // (40 trading days) shares with this chart's date range; older candles
    // just have no marker, same as Model2Chart.tsx's own chart.
    let y2y3Svg = ''
    let signalLabelSvg = ''
    if (y2y3Days && y2y3Days.length) {
      y2y3Days.forEach((day, j) => {
        const i = dateIdx[day.as_of_date]
        if (i === undefined || i >= bars.length) return
        const bar = bars[i]
        if (bar.high == null || bar.low == null) return

        if (isNoSignalDownDay(day)) {
          const recovered = findOpenPriceTouchIndex(y2y3Days, j, day.open_price!) != null
          y2y3Svg += starSvg(xCenter(i), yScale(bar.high) - 10, recovered, `${symbol}-${i}`)

          // Only still-relevant (unrecovered / full-star) levels get a line --
          // a half star already touched its open price again, so the level is
          // no longer worth watching. Dash to the current VIEWPORT's right
          // edge (not the data's fixed edge, which sits off past the future
          // margin now and was invisible unless dragged all the way out) and
          // label the price as a pill matching the main axis labels, right at
          // that same edge, so it reads as part of the axis rather than a
          // separate floating number.
          if (!recovered) {
            const startX = xCenter(i)
            const openY = yScale(day.open_price!)
            const endX = viewEndPx - 4
            if (endX > startX) {
              y2y3Svg += `<line x1="${startX.toFixed(1)}" y1="${openY.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${openY.toFixed(1)}" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/>`
              const label = `$${day.open_price!.toFixed(2)}`
              const pillW = label.length * 6.2 + 8
              const pillX = endX - pillW
              y2y3Svg += `<rect x="${pillX.toFixed(1)}" y="${(openY - 7).toFixed(1)}" width="${pillW.toFixed(1)}" height="14" rx="2" fill="#78350f" opacity="0.92"/>`
              y2y3Svg += `<text x="${(endX - 4).toFixed(1)}" y="${(openY + 3).toFixed(1)}" text-anchor="end" font-size="9" font-weight="bold" fill="#fde68a">${label}</text>`
            }
          }
        }

        if (day.final_signal && day.final_signal !== 'no_trade') {
          const isLong = day.final_signal === 'long'
          const color = isLong ? '#10b981' : '#ef4444'
          const cy = isLong ? yScale(bar.high) - 8 : yScale(bar.low) + 8
          y2y3Svg += `<circle cx="${xCenter(i).toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" fill="${color}" stroke="white" stroke-width="1"/>`

          // long/short + position-size labels below the x-axis dates
          const lx = xCenter(i)
          signalLabelSvg += `<text x="${lx.toFixed(1)}" y="${(HH - M.bottom + 32).toFixed(1)}" text-anchor="middle" font-size="7" font-weight="bold" fill="${color}">${day.final_signal!.toUpperCase()}</text>`
          if (day.position_size) {
            signalLabelSvg += `<text x="${lx.toFixed(1)}" y="${(HH - M.bottom + 41).toFixed(1)}" text-anchor="middle" font-size="7" fill="var(--mfh-text-muted)">${day.position_size > 0 ? `+${day.position_size}` : day.position_size}</text>`
          }
        }
      })
    }

    type LinePt = { i: number; val: number; high: number | undefined; low: number | undefined; pending: boolean }
    let linesSvg = ''
    byDate.forEach((s) => {
      const pts = allDates
        .map((date, i) => {
          const v = s.byDate[date]
          return v ? { i, val: v.predClose, high: v.predHigh, low: v.predLow, pending: v.pending } : null
        })
        .filter((p): p is LinePt => p !== null)
      if (!pts.length) return

      const firstPendingIdx = pts.findIndex((p) => p.pending)
      const solidPts = firstPendingIdx === -1 ? pts : pts.slice(0, firstPendingIdx + 1)
      const pendingPts = firstPendingIdx === -1 ? [] : pts.slice(firstPendingIdx)
      const toPath = (arr: LinePt[]) => arr.map((p) => `${xCenter(p.i).toFixed(1)},${yScale(p.val).toFixed(1)}`).join(' ')

      linesSvg += `<g id="mfh-series-${s.key}" style="display:${visibleRef.current[s.key] ? '' : 'none'}">`

      if (showBand) {
        const toBandPolygon = (arr: LinePt[], opacity: number) => {
          const withBand = arr.filter((p) => p.high != null && p.low != null)
          if (withBand.length < 2) return ''
          const top = withBand.map((p) => `${xCenter(p.i).toFixed(1)},${yScale(p.high as number).toFixed(1)}`)
          const bottom = withBand
            .slice()
            .reverse()
            .map((p) => `${xCenter(p.i).toFixed(1)},${yScale(p.low as number).toFixed(1)}`)
          return `<polygon points="${[...top, ...bottom].join(' ')}" fill="${s.color}" fill-opacity="${opacity}" stroke="none"/>`
        }
        linesSvg += toBandPolygon(solidPts, 0.16)
        linesSvg += toBandPolygon(pendingPts, 0.08)
      }

      linesSvg += `<polyline points="${toPath(solidPts)}" fill="none" stroke="${s.color}" stroke-width="2"/>`
      if (pendingPts.length > 1) {
        linesSvg += `<polyline points="${toPath(pendingPts)}" fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="4 3" opacity="0.8"/>`
      }
      linesSvg += `</g>`
    })

    // Invisible drag zones -- TradingView-style: drag the y-axis (either
    // side) up/down to rescale price, drag the x-axis (bottom) left/right to
    // widen/narrow candles. Positioned at the current VIEWPORT edges (like
    // the floating price labels above), not the data's absolute edges, so
    // they're always reachable regardless of scroll position.
    const axisHitSvg =
      `<rect class="mfh-axis-hit" data-axis="y" x="${viewStartPx.toFixed(1)}" y="0" width="${M.left}" height="${HH}" fill="transparent" style="cursor:ns-resize"/>` +
      `<rect class="mfh-axis-hit" data-axis="y" x="${(viewEndPx - M.right).toFixed(1)}" y="0" width="${M.right}" height="${HH}" fill="transparent" style="cursor:ns-resize"/>` +
      `<rect class="mfh-axis-hit" data-axis="x" x="0" y="${(HH - M.bottom).toFixed(1)}" width="${W}" height="${M.bottom}" fill="transparent" style="cursor:ew-resize"/>`

    svg.setAttribute('viewBox', `0 0 ${W} ${HH}`)
    svg.style.width = `${W}px`
    svg.innerHTML = `${gridSvg}${linesSvg}${candlesSvg}${y2y3Svg}${yLabelsSvg}${xLabelsSvg}${signalLabelSvg}<line class="mfh-crosshair" id="mfh-crosshair" y1="${M.top}" y2="${HH - M.bottom}"/>${axisHitSvg}`

    if (scrollEl) {
      if (isNewData) {
        // fresh dataset (symbol switch / initial load) -- default to the most
        // recent candles with a small right margin, not all the way into the
        // empty future space (that's for dragging into, not the default view)
        scrollEl.scrollLeft = defaultScrollLeft
      } else {
        // zoom tick -- keep the same relative scroll position instead of jumping
        const newMaxScroll = scrollEl.scrollWidth - scrollEl.clientWidth
        scrollEl.scrollLeft = newMaxScroll > 0 ? prevScrollRatio * newMaxScroll : 0
      }
    }

    const crosshair = svg.querySelector('#mfh-crosshair') as SVGLineElement

    const onMove = (e: PointerEvent) => {
      if (isDraggingAxisRef.current) return
      const rect = svg.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const i = Math.floor((mx - M.left) / BAR_W)
      if (i < 0 || i >= totalSlots) {
        tooltip.style.opacity = '0'
        crosshair.style.opacity = '0'
        return
      }
      const date = allDates[i]
      const b: OhlcBar | undefined = i < bars.length ? bars[i] : undefined
      const x = xCenter(i)
      crosshair.setAttribute('x1', String(x))
      crosshair.setAttribute('x2', String(x))
      crosshair.style.opacity = '1'

      const d = new Date(date + 'T00:00:00')
      let rows = b
        ? `
        <div class="mfh-tt-row"><span>Open</span><span class="mfh-tt-val">$${(b.open ?? 0).toFixed(2)}</span></div>
        <div class="mfh-tt-row"><span>High</span><span class="mfh-tt-val">$${(b.high ?? 0).toFixed(2)}</span></div>
        <div class="mfh-tt-row"><span>Low</span><span class="mfh-tt-val">$${(b.low ?? 0).toFixed(2)}</span></div>
        <div class="mfh-tt-row"><span>Close</span><span class="mfh-tt-val">$${(b.close ?? 0).toFixed(2)}</span></div>
      `
        : `<div class="mfh-tt-row"><span class="mfh-tt-pending">No OHLC yet -- trading day in progress</span></div>`
      byDate.forEach((s) => {
        if (!visibleRef.current[s.key]) return
        const v = s.byDate[date]
        if (!v) return
        const band = showBand && v.predHigh != null && v.predLow != null
          ? ` <span class="mfh-tt-pending">($${v.predLow.toFixed(2)}–$${v.predHigh.toFixed(2)})</span>`
          : ''
        rows += `<div class="mfh-tt-row"><span class="mfh-tt-name"><span class="mfh-tt-swatch" style="background:${s.color}"></span>${s.label}</span><span class="mfh-tt-val">$${v.predClose.toFixed(2)}${v.pending ? ' <span class="mfh-tt-pending">(pending)</span>' : ''}${band}</span></div>`
      })
      tooltip.innerHTML = `<div class="mfh-tt-date">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>${rows}`

      const wrapRect = wrap.getBoundingClientRect()
      let left = mx + 16
      if (left + 220 > wrapRect.width + wrap.scrollLeft) left = mx - 236
      tooltip.style.left = `${left}px`
      tooltip.style.top = `${e.clientY - rect.top - 10}px`
      tooltip.style.opacity = '1'
    }
    const onLeave = () => {
      tooltip.style.opacity = '0'
      crosshair.style.opacity = '0'
    }
    svg.addEventListener('pointermove', onMove)
    svg.addEventListener('pointerleave', onLeave)

    // Axis drag-to-zoom, TradingView style -- and continuous: holding the
    // mouse away from the start point keeps zooming every frame for as long
    // as the button is down, the way TradingView's axis drag does, rather
    // than mapping total drag distance to a single one-shot zoom amount.
    // Only pointerdown is bound to the (re-created-every-render) hit rects;
    // pointermove/up go on window, and the rAF loop + those listeners are
    // tracked in activeDragRef (not a local variable) so a zoom tick's own
    // redraw -- which reruns this whole effect -- doesn't kill the drag
    // that's still being held.
    const startContinuousZoom = (axis: 'x' | 'y', clientPos: number) => {
      let currentPos = clientPos
      const startPos = clientPos
      let lastTime = performance.now()
      let rafId = 0
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - lastTime) / 1000)
        lastTime = now
        // Distance from the start point is a RATE, not a one-time amount --
        // the farther you hold from where you started, the faster it zooms,
        // continuing every frame even if you stop moving. It's fine if some
        // history ends up outside the visible range once zoomed in hard;
        // the axis isn't trying to keep every bar in frame.
        const distance = axis === 'y' ? startPos - currentPos : currentPos - startPos
        if (Math.abs(distance) > 3) {
          const rate = distance / 70
          if (axis === 'y') {
            setYZoom((z) => Math.min(10, Math.max(0.02, z * Math.exp(-rate * dt))))
          } else {
            setBarW((w) => Math.min(80, Math.max(0.4, w * Math.exp(rate * dt))))
          }
        }
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
      return { updatePos: (p: number) => { currentPos = p }, stop: () => cancelAnimationFrame(rafId) }
    }
    const onAxisPointerDown = (axis: 'x' | 'y') => (e: PointerEvent) => {
      e.preventDefault()
      activeDragRef.current?.()
      isDraggingAxisRef.current = true
      tooltip.style.opacity = '0'
      crosshair.style.opacity = '0'
      const loop = startContinuousZoom(axis, axis === 'y' ? e.clientY : e.clientX)

      const onWinMove = (ev: PointerEvent) => loop.updatePos(axis === 'y' ? ev.clientY : ev.clientX)
      const onWinUp = () => {
        isDraggingAxisRef.current = false
        loop.stop()
        window.removeEventListener('pointermove', onWinMove)
        window.removeEventListener('pointerup', onWinUp)
        activeDragRef.current = null
      }
      window.addEventListener('pointermove', onWinMove)
      window.addEventListener('pointerup', onWinUp)
      activeDragRef.current = onWinUp
    }
    const resetY = () => {
      setYZoom(1)
      setYPanOffset(0)
    }
    const resetX = () => setBarW(barWidth)
    const hitRects = Array.from(svg.querySelectorAll<SVGRectElement>('.mfh-axis-hit'))
    const downHandlers = hitRects.map((r) => {
      const axis = r.dataset.axis as 'x' | 'y'
      const down = onAxisPointerDown(axis)
      const reset = axis === 'y' ? resetY : resetX
      r.addEventListener('pointerdown', down)
      r.addEventListener('dblclick', reset)
      return { r, down, reset }
    })

    // Click-and-drag anywhere on the plot pans in both directions -- sideways
    // scrolls through time, up/down shifts the (auto-fit) price window by an
    // offset without changing how zoomed in it is. Zooming only ever comes
    // from dragging the dedicated axis margins, never from the plot itself.
    // Skips clicks that started on an axis hit-rect (those have their own
    // dedicated drag) so this doesn't double-fire via event bubbling.
    const pricePerPixel = (yMax - yMin) / plotH
    const onPlotPointerDown = (e: PointerEvent) => {
      if ((e.target as Element).closest('.mfh-axis-hit')) return
      const scrollEl = scrollRef.current
      if (!scrollEl) return
      e.preventDefault()
      activeDragRef.current?.()
      isDraggingAxisRef.current = true
      tooltip.style.opacity = '0'
      crosshair.style.opacity = '0'
      svg.style.cursor = 'grabbing'
      const startX = e.clientX
      const startY = e.clientY
      const startScrollLeft = scrollEl.scrollLeft
      const startYPanOffset = yPanOffset

      const onWinMove = (ev: PointerEvent) => {
        scrollEl.scrollLeft = startScrollLeft - (ev.clientX - startX)
        setYPanOffset(startYPanOffset + (ev.clientY - startY) * pricePerPixel)
      }
      const onWinUp = () => {
        isDraggingAxisRef.current = false
        svg.style.cursor = 'grab'
        window.removeEventListener('pointermove', onWinMove)
        window.removeEventListener('pointerup', onWinUp)
        activeDragRef.current = null
      }
      window.addEventListener('pointermove', onWinMove)
      window.addEventListener('pointerup', onWinUp)
      activeDragRef.current = onWinUp
    }
    svg.addEventListener('pointerdown', onPlotPointerDown)

    return () => {
      svg.removeEventListener('pointermove', onMove)
      svg.removeEventListener('pointerleave', onLeave)
      svg.removeEventListener('pointerdown', onPlotPointerDown)
      downHandlers.forEach(({ r, down, reset }) => {
        r.removeEventListener('pointerdown', down)
        r.removeEventListener('dblclick', reset)
      })
      // Deliberately NOT stopping activeDragRef here -- this cleanup also
      // runs on every zoom-driven redraw (barW/yZoom changed), and killing
      // the drag there would cut it off after a single frame. Real teardown
      // (ticker switch, unmount) stops it explicitly elsewhere.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, y2y3Days, barW, yZoom, yPanOffset, scrollTick, shiftToTarget, showBand])

  function toggleSeries(key: string) {
    visibleRef.current[key] = !visibleRef.current[key]
    const g = svgRef.current?.querySelector(`#mfh-series-${key}`) as SVGGElement | null
    if (g) g.style.display = visibleRef.current[key] ? '' : 'none'
    forceRerender((n) => n + 1)
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
        Chart data unavailable right now.
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
        Loading chart…
      </div>
    )
  }

  return (
    <div
      className="mfh-root rounded-xl border p-4"
      style={{ borderColor: 'var(--mfh-border)', background: 'var(--mfh-surface)' }}
    >
      <style>{`
        .mfh-root {
          --mfh-surface: #fcfcfb;
          --mfh-ink: #0b0b0b;
          --mfh-text-secondary: #52514e;
          --mfh-text-muted: #898781;
          --mfh-grid: #e1e0d9;
          --mfh-border: rgba(11,11,11,0.10);
          --mfh-series-1: #2a78d6;
          --mfh-series-2: #eb6834;
          --mfh-series-3: #1baf7a;
          --mfh-series-4: #eda100;
          --mfh-series-5: #e87ba4;
        }
        @media (prefers-color-scheme: dark) {
          .mfh-root {
            --mfh-surface: #1a1a19;
            --mfh-ink: #ffffff;
            --mfh-text-secondary: #c3c2b7;
            --mfh-text-muted: #898781;
            --mfh-grid: #2c2c2a;
            --mfh-border: rgba(255,255,255,0.10);
            --mfh-series-1: #3987e5;
            --mfh-series-2: #d95926;
            --mfh-series-3: #199e70;
            --mfh-series-4: #c98500;
            --mfh-series-5: #d55181;
          }
        }
        .mfh-legend { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
        .mfh-legend-item { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--mfh-text-secondary); }
        .mfh-candle { width: 10px; height: 14px; border: 1.5px solid #059669; border-radius: 1px; background: #10b981; }
        .mfh-candle.down { border-color: #dc2626; background: #ef4444; }
        .mfh-toggle {
          display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--mfh-ink);
          background: transparent; border: 1px solid var(--mfh-border); border-radius: 999px;
          padding: 5px 12px 5px 10px; cursor: pointer; font-family: inherit; transition: opacity 0.12s;
        }
        .mfh-toggle.off { opacity: 0.4; }
        .mfh-toggle-line { width: 16px; height: 2.5px; border-radius: 2px; display: inline-block; }
        .mfh-stats { display: flex; gap: 18px; margin-bottom: 12px; flex-wrap: wrap; font-size: 12px; color: var(--mfh-text-secondary); }
        .mfh-stats b { color: var(--mfh-ink); }
        .mfh-scroll { overflow-x: auto; overflow-y: hidden; border-radius: 8px; }
        .mfh-root svg { display: block; height: ${HH}px; cursor: grab; touch-action: none; }
        .mfh-root svg:active { cursor: grabbing; }
        .mfh-grid { stroke: var(--mfh-grid); stroke-width: 1; }
        .mfh-axis-label { fill: var(--mfh-text-muted); font-size: 10px; }
        .mfh-axis-label-bg { fill: var(--mfh-surface); opacity: 0.88; }
        .mfh-crosshair { stroke: var(--mfh-text-muted); stroke-width: 1; stroke-dasharray: 2 3; pointer-events: none; opacity: 0; }
        .mfh-chart-wrap { position: relative; }
        .mfh-tooltip {
          position: absolute; pointer-events: none; background: var(--mfh-surface);
          border: 1px solid var(--mfh-border); border-radius: 8px; padding: 10px 12px;
          font-size: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.14); opacity: 0;
          transition: opacity 0.08s; min-width: 200px; z-index: 10; color: var(--mfh-text-secondary);
        }
        .mfh-tt-date { font-weight: 600; margin-bottom: 6px; color: var(--mfh-ink); }
        .mfh-tt-row { display: flex; justify-content: space-between; gap: 14px; margin: 3px 0; }
        .mfh-tt-name { display: flex; align-items: center; gap: 6px; }
        .mfh-tt-swatch { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .mfh-tt-val { font-weight: 600; color: var(--mfh-ink); font-variant-numeric: tabular-nums; }
        .mfh-tt-pending { font-size: 10px; color: var(--mfh-text-muted); font-style: italic; }
      `}</style>

      <div className="mfh-legend">
        <div className="mfh-legend-item">
          <span className="mfh-candle" /> Up day
        </div>
        <div className="mfh-legend-item">
          <span className="mfh-candle down" /> Down day
        </div>
        {SERIES.map((s) => (
          <button
            key={s.key}
            className={`mfh-toggle${visibleRef.current[s.key] ? '' : ' off'}`}
            onClick={() => toggleSeries(s.key)}
          >
            <span className="mfh-toggle-line" style={{ background: visibleRef.current[s.key] ? s.color : 'var(--mfh-text-muted)' }} />
            {s.label}
          </button>
        ))}
        <button
          className={`mfh-toggle${shiftToTarget ? '' : ' off'}`}
          onClick={() => setShiftToTarget((v) => !v)}
          title="Plot each line at the day it's forecasting (origin + N days) instead of the day the forecast was made"
        >
          <span className="mfh-toggle-line" style={{ background: shiftToTarget ? 'var(--mfh-ink)' : 'var(--mfh-text-muted)' }} />
          shift to target day
        </button>
        <button
          className={`mfh-toggle${showBand ? '' : ' off'}`}
          onClick={() => setShowBand((v) => !v)}
          title="Shade the predicted high-low range around each visible line, not just its center forecast"
        >
          <span className="mfh-toggle-line" style={{ background: showBand ? 'var(--mfh-ink)' : 'var(--mfh-text-muted)' }} />
          range band
        </button>
        {y2y3Days && y2y3Days.length > 0 && (
          <>
            <span className="mfh-legend-item" title="No trade signal on a down day">
              <span style={{ color: '#fbbf24' }}>★</span> no-trade down day
            </span>
            <span className="mfh-legend-item" title="Open price on a starred day -- read the level off the right axis">
              <span style={{ display: 'inline-block', width: 14, height: 0, borderTop: '1.5px dashed #fbbf24' }} /> open price level
            </span>
            <span className="mfh-legend-item" title="y2y3 model long/short signal">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />/
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> long/short
            </span>
          </>
        )}
      </div>

      <div className="mfh-scroll" ref={scrollRef}>
        <div className="mfh-chart-wrap" ref={wrapRef}>
          <svg ref={svgRef} preserveAspectRatio="none" />
          <div className="mfh-tooltip" ref={tooltipRef} />
        </div>
      </div>
    </div>
  )
}
