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

const SERIES = [
  { key: '1d', label: '1-day', color: 'var(--mfh-series-1)' },
  { key: '5d', label: '5-day', color: 'var(--mfh-series-2)' },
  { key: '10d', label: '10-day', color: 'var(--mfh-series-3)' },
  { key: '15d', label: '15-day', color: 'var(--mfh-series-4)' },
  { key: '20d', label: '20-day', color: 'var(--mfh-series-5)' },
] as const

const HH = 420
const M = { top: 16, right: 18, bottom: 30, left: 58 }
const BAR_W = 5.5

export default function HorizonLinesChart() {
  const [data, setData] = useState<HistoryPayload | null>(null)
  const [error, setError] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef<Record<string, boolean>>({ '1d': true, '5d': true, '10d': true, '15d': true, '20d': true })
  const [, forceRerender] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/moneyflow-horizon/history')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d?.status === 'missing') setError(true)
        else setData(d)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

    const byDate = seriesData.map((s) => {
      const map: Record<string, { predClose: number; pending: boolean }> = {}
      s.data.predictions.forEach((p) => {
        if (dateIdx[p.origin_date] === undefined) return
        map[p.origin_date] = { predClose: p.pred_close_price, pending: !!p.is_pending }
      })
      return { ...s, byDate: map }
    })

    const plotH = HH - M.top - M.bottom
    const W = M.left + M.right + bars.length * BAR_W

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
    }

    let xLabelsSvg = ''
    const xLabelEvery = Math.ceil(bars.length / 10) || 1
    bars.forEach((b, i) => {
      if (i % xLabelEvery === 0) {
        const d = new Date(b.date + 'T00:00:00')
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
      if (b.high != null && b.low != null) {
        candlesSvg += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${yScale(b.high).toFixed(1)}" y2="${yScale(b.low).toFixed(1)}" stroke="var(--mfh-ink)" stroke-width="1"/>`
      }
      candlesSvg += `<rect x="${(x - bodyW / 2).toFixed(1)}" y="${bodyTop.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${Math.max(1, bodyBot - bodyTop).toFixed(1)}" fill="${up ? 'var(--mfh-surface)' : 'var(--mfh-ink)'}" stroke="var(--mfh-ink)" stroke-width="1"/>`
    })

    let linesSvg = ''
    byDate.forEach((s) => {
      const pts = bars
        .map((b, i) => {
          const v = s.byDate[b.date]
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
    svg.innerHTML = `${gridSvg}${linesSvg}${candlesSvg}${yLabelsSvg}${xLabelsSvg}<line class="mfh-crosshair" id="mfh-crosshair" y1="${M.top}" y2="${HH - M.bottom}"/>`

    const crosshair = svg.querySelector('#mfh-crosshair') as SVGLineElement

    const onMove = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const i = Math.floor((mx - M.left) / BAR_W)
      if (i < 0 || i >= bars.length) {
        tooltip.style.opacity = '0'
        crosshair.style.opacity = '0'
        return
      }
      const b = bars[i]
      const x = xCenter(i)
      crosshair.setAttribute('x1', String(x))
      crosshair.setAttribute('x2', String(x))
      crosshair.style.opacity = '1'

      const d = new Date(b.date + 'T00:00:00')
      let rows = `
        <div class="mfh-tt-row"><span>Open</span><span class="mfh-tt-val">$${(b.open ?? 0).toFixed(2)}</span></div>
        <div class="mfh-tt-row"><span>High</span><span class="mfh-tt-val">$${(b.high ?? 0).toFixed(2)}</span></div>
        <div class="mfh-tt-row"><span>Low</span><span class="mfh-tt-val">$${(b.low ?? 0).toFixed(2)}</span></div>
        <div class="mfh-tt-row"><span>Close</span><span class="mfh-tt-val">$${(b.close ?? 0).toFixed(2)}</span></div>
      `
      byDate.forEach((s) => {
        if (!visibleRef.current[s.key]) return
        const v = s.byDate[b.date]
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
  }, [data])

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
        .mfh-candle { width: 10px; height: 14px; border: 1.5px solid var(--mfh-ink); border-radius: 1px; }
        .mfh-candle.down { background: var(--mfh-ink); }
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
      </div>

      <div className="mfh-scroll">
        <div className="mfh-chart-wrap" ref={wrapRef}>
          <svg ref={svgRef} preserveAspectRatio="none" />
          <div className="mfh-tooltip" ref={tooltipRef} />
        </div>
      </div>
    </div>
  )
}
