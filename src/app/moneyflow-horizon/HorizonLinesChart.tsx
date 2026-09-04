'use client'

import { useEffect, useRef, useState } from 'react'

type OhlcBar = { date: string; open: number | null; high: number | null; low: number | null; close: number | null }
type Prediction = {
  origin_date: string
  pred_close_price: number
  is_pending?: boolean
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
  const BAR_W = barWidth
  const [data, setData] = useState<HistoryPayload | null>(null)
  const [error, setError] = useState(false)
  const [y2y3Days, setY2y3Days] = useState<Y2Y3Day[] | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef<Record<string, boolean>>({ '1d': false, '5d': false, '10d': true, '15d': false, '20d': true })
  const [, forceRerender] = useState(0)

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

    // A forecast can exist for a day that has no candle yet (today, still in
    // progress) -- give those dates their own trailing x-axis slot instead of
    // silently dropping them.
    const lastBarDate = bars.length ? bars[bars.length - 1].date : ''
    const extraDateSet = new Set<string>()
    seriesData.forEach((s) => {
      s.data.predictions.forEach((p) => {
        if (dateIdx[p.origin_date] === undefined && p.origin_date > lastBarDate) {
          extraDateSet.add(p.origin_date)
        }
      })
    })
    const extraDates = Array.from(extraDateSet).sort()
    extraDates.forEach((d, j) => {
      dateIdx[d] = bars.length + j
    })
    const totalSlots = bars.length + extraDates.length

    const byDate = seriesData.map((s) => {
      const map: Record<string, { predClose: number; pending: boolean }> = {}
      s.data.predictions.forEach((p) => {
        if (dateIdx[p.origin_date] === undefined) return
        map[p.origin_date] = { predClose: p.pred_close_price, pending: !!p.is_pending }
      })
      return { ...s, byDate: map }
    })

    const plotH = HH - M.top - M.bottom
    const W = M.left + M.right + totalSlots * BAR_W

    const allPrices: number[] = []
    bars.forEach((b) => {
      if (b.high != null) allPrices.push(b.high)
      if (b.low != null) allPrices.push(b.low)
    })
    byDate.forEach((s) => Object.values(s.byDate).forEach((v) => allPrices.push(v.predClose)))
    const yMin = Math.min(...allPrices) * 0.99
    const yMax = Math.max(...allPrices) * 1.01

    const xLeft = (i: number) => M.left + i * BAR_W
    const xCenter = (i: number) => M.left + (i + 0.5) * BAR_W
    const yScale = (v: number) => M.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH

    let gridSvg = ''
    let yLabelsSvg = ''
    for (let i = 0; i <= 5; i++) {
      const v = yMin + (yMax - yMin) * (i / 5)
      const y = yScale(v)
      gridSvg += `<line class="mfh-grid" x1="${M.left}" x2="${W - M.right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`
      yLabelsSvg += `<text class="mfh-axis-label" x="${M.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">$${Math.round(v)}</text>`
      yLabelsSvg += `<text class="mfh-axis-label" x="${W - M.right + 8}" y="${(y + 4).toFixed(1)}" text-anchor="start">$${Math.round(v)}</text>`
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
          // no longer worth watching. Dash all the way to the right price axis
          // (rather than stopping at the revisit day) and label that specific
          // price right on the axis, since with many stars packed into a
          // narrow chart, inline labels mid-chart piled up unreadably.
          if (!recovered) {
            const startX = xCenter(i)
            const openY = yScale(day.open_price!)
            const endX = W - M.right
            if (endX > startX) {
              y2y3Svg += `<line x1="${startX.toFixed(1)}" y1="${openY.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${openY.toFixed(1)}" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/>`
              y2y3Svg += `<text x="${(endX + 8).toFixed(1)}" y="${(openY + 3).toFixed(1)}" text-anchor="start" font-size="9" font-weight="bold" fill="#fbbf24">$${day.open_price!.toFixed(2)}</text>`
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

    let linesSvg = ''
    byDate.forEach((s) => {
      const pts = allDates
        .map((date, i) => {
          const v = s.byDate[date]
          return v ? { i, val: v.predClose, pending: v.pending } : null
        })
        .filter((p): p is { i: number; val: number; pending: boolean } => p !== null)
      if (!pts.length) return

      const firstPendingIdx = pts.findIndex((p) => p.pending)
      const solidPts = firstPendingIdx === -1 ? pts : pts.slice(0, firstPendingIdx + 1)
      const pendingPts = firstPendingIdx === -1 ? [] : pts.slice(firstPendingIdx)
      const toPath = (arr: typeof pts) => arr.map((p) => `${xCenter(p.i).toFixed(1)},${yScale(p.val).toFixed(1)}`).join(' ')

      linesSvg += `<g id="mfh-series-${s.key}" style="display:${visibleRef.current[s.key] ? '' : 'none'}">`
      linesSvg += `<polyline points="${toPath(solidPts)}" fill="none" stroke="${s.color}" stroke-width="2"/>`
      if (pendingPts.length > 1) {
        linesSvg += `<polyline points="${toPath(pendingPts)}" fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="4 3" opacity="0.8"/>`
      }
      linesSvg += `</g>`
    })

    svg.setAttribute('viewBox', `0 0 ${W} ${HH}`)
    svg.style.width = `${W}px`
    svg.innerHTML = `${gridSvg}${linesSvg}${candlesSvg}${y2y3Svg}${yLabelsSvg}${xLabelsSvg}${signalLabelSvg}<line class="mfh-crosshair" id="mfh-crosshair" y1="${M.top}" y2="${HH - M.bottom}"/>`

    // default view to the most recent data, not the oldest
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }

    const crosshair = svg.querySelector('#mfh-crosshair') as SVGLineElement

    const onMove = (e: PointerEvent) => {
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
        rows += `<div class="mfh-tt-row"><span class="mfh-tt-name"><span class="mfh-tt-swatch" style="background:${s.color}"></span>${s.label}</span><span class="mfh-tt-val">$${v.predClose.toFixed(2)}${v.pending ? ' <span class="mfh-tt-pending">(pending)</span>' : ''}</span></div>`
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
    return () => {
      svg.removeEventListener('pointermove', onMove)
      svg.removeEventListener('pointerleave', onLeave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, y2y3Days])

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
        .mfh-root svg { display: block; height: ${HH}px; }
        .mfh-grid { stroke: var(--mfh-grid); stroke-width: 1; }
        .mfh-axis-label { fill: var(--mfh-text-muted); font-size: 10px; }
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
