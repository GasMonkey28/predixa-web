'use client'

import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceDot, ReferenceLine,
} from 'recharts'

const POLL_MS = 60_000

type Series = {
  label: string
  occ: string
  cp: 'C' | 'P'
  strike: number
  mid: number
  breakeven: number
  total: number
  points: [number, number][] // [minute_bucket (unix s), cumulative dollars]
  be_points?: [number, number][] // [minute_bucket, target level = strike ± mid]
  delta_points?: [number, number][] // [minute_bucket, signed Δmid × minute volume × 100]
}
type Payload = {
  status: string
  as_of?: string
  day?: string
  spot?: number
  session_open?: number
  session_close?: number
  minutes?: number
  spot_path?: [number, number][] // [minute_bucket, SPY price]
  series?: Series[]
  hint?: string
}

// calls = green→blue arc, puts = red→amber arc
const CALL_COLORS = ['#15803d', '#0d9488', '#0891b2', '#2563eb', '#4f46e5', '#7c3aed']
const PUT_COLORS = ['#dc2626', '#e11d48', '#ea580c', '#d97706', '#b45309', '#be123c']

const fmtM = (v: number) => `$${(v / 1e6).toFixed(1)}M`
const fmtTime = (unixSec: number) =>
  new Date(unixSec * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', hour12: false,
  })

export default function MoneyMoveChart() {
  const [data, setData] = useState<Payload | null>(null)
  const [topN, setTopN] = useState(5)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch('/api/option-chain/money-move', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d: Payload) => !cancelled && setData(d))
        .catch(() => {})
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const all = useMemo(() => data?.series ?? [], [data])
  const series = useMemo(() => all.slice(0, topN), [all, topN])
  const open = data?.session_open ?? null
  const close = data?.session_close ?? null
  const spot = data?.spot ?? null
  const hasTargets = series.length > 0 && series.every((s) => typeof s.breakeven === 'number' && Number.isFinite(s.breakeven))

  // a stable colour per contract (keyed off the full list so it doesn't
  // shuffle when topN changes), by call/put family
  const colorOf = useMemo(() => {
    const m = new Map<string, string>()
    let ci = 0
    let pi = 0
    for (const s of all) {
      m.set(s.occ, s.cp === 'C' ? CALL_COLORS[ci++ % CALL_COLORS.length] : PUT_COLORS[pi++ % PUT_COLORS.length])
    }
    return m
  }, [all])

  // pivot: every series zero-filled from the 9:30 open until its first trade
  const rows = useMemo(() => {
    const byT = new Map<number, Record<string, number>>()
    if (open != null) byT.set(open, { t: open })
    for (const s of series) for (const [t] of s.points) if (!byT.has(t)) byT.set(t, { t })
    const times = [...byT.keys()].sort((a, b) => a - b)
    for (const s of series) {
      const start = s.points[0]?.[0] ?? Infinity
      const pv = new Map(s.points)
      let last = 0
      for (const t of times) {
        if (t < start) byT.get(t)![s.label] = 0
        else {
          if (pv.has(t)) last = pv.get(t)!
          byT.get(t)![s.label] = last
        }
      }
    }
    return times.map((t) => byT.get(t)!)
  }, [series, open])

  // right axis just fits the targets (and spot), with a little margin. No
  // clamp, no minimum window — a contract far from spot has no volume so it
  // never reaches the top-N anyway.
  const priceDomain = useMemo<[number, number] | undefined>(() => {
    if (!hasTargets || spot == null) return undefined
    const vals = [spot, ...series.map((s) => s.breakeven)]
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const pad = Math.max((hi - lo) * 0.12, 0.25)
    return [lo - pad, hi + pad]
  }, [series, spot, hasTargets])

  const targets = useMemo(() => {
    if (!hasTargets || !priceDomain) return []
    const [lo, hi] = priceDomain
    return series.map((s) => ({ ...s, y: Math.min(hi, Math.max(lo, s.breakeven)) }))
  }, [series, hasTargets, priceDomain])

  // companion chart: SPY's 1-min path today + each top contract's target level,
  // both on a $-price axis, sharing the time axis above
  const priceRows = useMemo(() => {
    const sp = data?.spot_path ?? []
    if (sp.length === 0) return []
    const byT = new Map<number, Record<string, number>>()
    for (const [t, p] of sp) byT.set(t, { t, __spot: p })
    for (const s of series) {
      for (const [t, be] of s.be_points ?? []) {
        const row = byT.get(t) ?? { t }
        row[s.label] = be
        byT.set(t, row)
      }
    }
    return [...byT.values()].sort((a, b) => a.t - b.t)
  }, [data, series])

  const pricePathDomain = useMemo<[number, number] | undefined>(() => {
    if (priceRows.length === 0) return undefined
    let lo = Infinity
    let hi = -Infinity
    for (const r of priceRows) {
      for (const k in r) {
        if (k === 't') continue
        lo = Math.min(lo, r[k])
        hi = Math.max(hi, r[k])
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined
    const pad = Math.max((hi - lo) * 0.08, 0.25)
    return [lo - pad, hi + pad]
  }, [priceRows])

  // third chart: signed "delta $" per minute — how much each contract repriced
  // that minute times the minute's volume. Not cumulative: expect spikes.
  const deltaRows = useMemo(() => {
    const hasAny = series.some((s) => (s.delta_points?.length ?? 0) > 0)
    if (!hasAny) return []
    const byT = new Map<number, Record<string, number>>()
    if (open != null) byT.set(open, { t: open })
    for (const s of series) {
      for (const [t, d] of s.delta_points ?? []) {
        const row = byT.get(t) ?? { t }
        row[s.label] = d
        byT.set(t, row)
      }
    }
    return [...byT.values()].sort((a, b) => a.t - b.t)
  }, [series, open])

  // fourth chart: distance to target = |target − SPY|, for the two busiest
  // calls and two busiest puts (faint) plus each side's average (bold), SPY on
  // its own axis. Small = SPY is close to that side's breakeven.
  const gap = useMemo(() => {
    const sp = data?.spot_path ?? []
    if (sp.length === 0 || !hasTargets) return null
    const spotAt = new Map(sp.map(([t, p]) => [t, p]))
    const calls = all.filter((s) => s.cp === 'C' && (s.be_points?.length ?? 0) > 0).slice(0, 2)
    const puts = all.filter((s) => s.cp === 'P' && (s.be_points?.length ?? 0) > 0).slice(0, 2)
    if (!calls.length && !puts.length) return null

    const byT = new Map<number, Record<string, number>>()
    for (const [t, p] of sp) byT.set(t, { t, spy: p })
    const fill = (s: Series, key: string) => {
      for (const [t, be] of s.be_points ?? []) {
        const spt = spotAt.get(t)
        if (spt == null) continue
        const row = byT.get(t) ?? { t }
        row[key] = Math.round(Math.abs(be - spt) * 100) / 100
        byT.set(t, row)
      }
    }
    calls.forEach((s, i) => fill(s, `c${i + 1}`))
    puts.forEach((s, i) => fill(s, `p${i + 1}`))

    const rows = [...byT.values()].sort((a, b) => a.t - b.t)
    const mean = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100
    for (const r of rows) {
      const cs = calls.map((_, i) => r[`c${i + 1}`]).filter((v): v is number => v != null)
      const ps = puts.map((_, i) => r[`p${i + 1}`]).filter((v): v is number => v != null)
      if (cs.length) r.cAvg = mean(cs)
      if (ps.length) r.pAvg = mean(ps)
    }

    const labels: Record<string, string> = { spy: 'SPY', cAvg: 'call avg distance', pAvg: 'put avg distance' }
    calls.forEach((s, i) => (labels[`c${i + 1}`] = s.label))
    puts.forEach((s, i) => (labels[`p${i + 1}`] = s.label))
    return { rows, labels, nCalls: calls.length, nPuts: puts.length }
  }, [data, all, hasTargets])

  const gapSpyDomain = useMemo<[number, number] | undefined>(() => {
    if (!gap) return undefined
    let lo = Infinity
    let hi = -Infinity
    for (const r of gap.rows) {
      if (typeof r.spy !== 'number') continue
      lo = Math.min(lo, r.spy)
      hi = Math.max(hi, r.spy)
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined
    const pad = Math.max((hi - lo) * 0.12, 0.25)
    return [lo - pad, hi + pad]
  }, [gap])

  if (!data || data.status !== 'ok' || !series.length) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
        No money-move data yet — it&apos;s recomputed every 5 minutes during market hours.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="uppercase tracking-wide">Show top</span>
        {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            onClick={() => setTopN(n)}
            className={clsx(
              'rounded px-1.5 py-0.5 font-medium tabular-nums',
              n === topN
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="h-96 w-full">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 64, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[open ?? 'dataMin', close ?? 'dataMax']}
              tickFormatter={fmtTime}
              tick={{ fontSize: 11 }}
              minTickGap={40}
            />
            <YAxis
              yAxisId="dollars"
              tickFormatter={fmtM}
              tick={{ fontSize: 11 }}
              width={60}
            />
            {hasTargets && (
              <YAxis
                yAxisId="price"
                orientation="right"
                domain={priceDomain ?? ['auto', 'auto']}
                tickFormatter={(v: number) => v.toFixed(0)}
                tick={{ fontSize: 10 }}
                width={40}
              />
            )}
            <Tooltip
              labelFormatter={(t) => `${fmtTime(Number(t))} ET`}
              formatter={(v: number, name) => {
                const s = series.find((x) => x.label === name)
                const tgt =
                  s && typeof s.breakeven === 'number' && Number.isFinite(s.breakeven)
                    ? `  ·  target ${s.breakeven.toFixed(2)}`
                    : ''
                return [`${fmtM(v)}${tgt}`, name]
              }}
              contentStyle={{ fontSize: 12 }}
              itemSorter={(i) => -(i.value as number)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((s) => (
              <Line
                key={s.occ}
                yAxisId="dollars"
                type="monotone"
                dataKey={s.label}
                stroke={colorOf.get(s.occ)}
                strokeWidth={1.75}
                dot={false}
              />
            ))}
            {hasTargets && spot != null && (
              <ReferenceLine
                yAxisId="price"
                y={spot}
                stroke="currentColor"
                strokeOpacity={0.35}
                strokeDasharray="2 3"
                label={{ value: `spot ${spot.toFixed(2)}`, position: 'left', fontSize: 10, fill: 'currentColor' }}
              />
            )}
            {close != null && targets.map((s) => (
              <ReferenceDot
                key={`${s.occ}-be`}
                yAxisId="price"
                x={close}
                y={s.y}
                r={3.5}
                fill={colorOf.get(s.occ)}
                stroke="none"
                ifOverflow="visible"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {priceRows.length > 0 && (
        <div className="h-72 w-full text-gray-900 dark:text-white">
          <ResponsiveContainer>
            <LineChart data={priceRows} margin={{ top: 4, right: 64, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[open ?? 'dataMin', close ?? 'dataMax']}
                tickFormatter={fmtTime}
                tick={{ fontSize: 11 }}
                minTickGap={40}
              />
              <YAxis
                yAxisId="lvl"
                domain={pricePathDomain ?? ['auto', 'auto']}
                tickFormatter={(v: number) => v.toFixed(0)}
                tick={{ fontSize: 11 }}
                width={60}
              />
              {/* keeps the plot area aligned with the $-flow chart above */}
              <YAxis yAxisId="pad" orientation="right" width={40} tick={false} axisLine={false} tickLine={false} />
              <Tooltip
                labelFormatter={(t) => `${fmtTime(Number(t))} ET`}
                formatter={(v: number, name) => [v.toFixed(2), name === '__spot' ? 'SPY' : name]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {series.map((s) => (
                <Line
                  key={s.occ}
                  yAxisId="lvl"
                  type="monotone"
                  dataKey={s.label}
                  name={`${s.label} target`}
                  stroke={colorOf.get(s.occ)}
                  strokeWidth={1.4}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                />
              ))}
              <Line
                yAxisId="lvl"
                type="monotone"
                dataKey="__spot"
                name="SPY"
                stroke="currentColor"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {deltaRows.length > 0 && (
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={deltaRows} margin={{ top: 4, right: 64, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[open ?? 'dataMin', close ?? 'dataMax']}
                tickFormatter={fmtTime}
                tick={{ fontSize: 11 }}
                minTickGap={40}
              />
              <YAxis
                yAxisId="delta"
                tickFormatter={fmtM}
                tick={{ fontSize: 11 }}
                width={60}
              />
              {/* keeps the plot area aligned with the charts above */}
              <YAxis yAxisId="pad" orientation="right" width={40} tick={false} axisLine={false} tickLine={false} />
              <Tooltip
                labelFormatter={(t) => `${fmtTime(Number(t))} ET`}
                formatter={(v: number, name) => [fmtM(v), name]}
                contentStyle={{ fontSize: 12 }}
                itemSorter={(i) => -Math.abs(i.value as number)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="delta" y={0} stroke="currentColor" strokeOpacity={0.3} />
              {series.map((s) => (
                <Line
                  key={s.occ}
                  yAxisId="delta"
                  type="linear"
                  dataKey={s.label}
                  stroke={colorOf.get(s.occ)}
                  strokeWidth={1.4}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {gap && (
        <div className="h-80 w-full text-gray-900 dark:text-white">
          <ResponsiveContainer>
            <LineChart data={gap.rows} margin={{ top: 4, right: 64, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[open ?? 'dataMin', close ?? 'dataMax']}
                tickFormatter={fmtTime}
                tick={{ fontSize: 11 }}
                minTickGap={40}
              />
              <YAxis
                yAxisId="gap"
                tickFormatter={(v: number) => v.toFixed(1)}
                tick={{ fontSize: 11 }}
                width={60}
                label={{ value: 'distance to target ($)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'currentColor' }}
              />
              <YAxis
                yAxisId="spy"
                orientation="right"
                domain={gapSpyDomain ?? ['auto', 'auto']}
                tickFormatter={(v: number) => v.toFixed(0)}
                tick={{ fontSize: 10 }}
                width={40}
              />
              <Tooltip
                labelFormatter={(t) => `${fmtTime(Number(t))} ET`}
                formatter={(v: number, name) => [v.toFixed(2), name]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {Array.from({ length: gap.nCalls }, (_, i) => (
                <Line
                  key={`c${i + 1}`}
                  yAxisId="gap"
                  type="monotone"
                  dataKey={`c${i + 1}`}
                  name={gap.labels[`c${i + 1}`]}
                  stroke="#15803d"
                  strokeWidth={1}
                  strokeOpacity={0.45}
                  strokeDasharray="3 3"
                  dot={false}
                  legendType="none"
                  connectNulls
                />
              ))}
              {Array.from({ length: gap.nPuts }, (_, i) => (
                <Line
                  key={`p${i + 1}`}
                  yAxisId="gap"
                  type="monotone"
                  dataKey={`p${i + 1}`}
                  name={gap.labels[`p${i + 1}`]}
                  stroke="#dc2626"
                  strokeWidth={1}
                  strokeOpacity={0.45}
                  strokeDasharray="3 3"
                  dot={false}
                  legendType="none"
                  connectNulls
                />
              ))}
              <Line
                yAxisId="gap"
                type="monotone"
                dataKey="cAvg"
                name="top-2 call avg"
                stroke="#15803d"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="gap"
                type="monotone"
                dataKey="pAvg"
                name="top-2 put avg"
                stroke="#dc2626"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="spy"
                type="monotone"
                dataKey="spy"
                name="SPY"
                stroke="currentColor"
                strokeWidth={2}
                strokeOpacity={0.55}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs tabular-nums">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-[10px] uppercase tracking-wide text-gray-400">
              <th className="py-1.5 pr-4">Contract</th>
              <th className="py-1.5 pr-4">Type</th>
              <th className="py-1.5 pr-4">Opt px</th>
              <th className="py-1.5 pr-4">Target</th>
              <th className="py-1.5 pr-4">$ traded today</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.occ} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-1 pr-4">
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-sm align-middle"
                    style={{ background: colorOf.get(s.occ) }}
                  />
                  {s.label}
                </td>
                <td className={s.cp === 'C' ? 'py-1 pr-4 text-emerald-600 dark:text-emerald-400' : s.cp === 'P' ? 'py-1 pr-4 text-rose-600 dark:text-rose-400' : 'py-1 pr-4 text-gray-400'}>
                  {s.cp === 'C' ? 'Call' : s.cp === 'P' ? 'Put' : '—'}
                </td>
                <td className="py-1 pr-4 text-gray-500">{typeof s.mid === 'number' ? s.mid.toFixed(2) : '—'}</td>
                <td className="py-1 pr-4 font-medium text-gray-900 dark:text-white">{typeof s.breakeven === 'number' ? s.breakeven.toFixed(2) : '—'}</td>
                <td className="py-1 pr-4 font-medium text-gray-900 dark:text-white">{fmtM(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Contracts <em>expiring today</em> only. 1st chart: cumulative traded
        dollars per contract (each minute&apos;s new volume × mid × 100); the
        right-edge dots mark each one&apos;s <em>target</em> — strike ± the
        option&apos;s price. 2nd chart: SPY&apos;s own 1-minute path (solid)
        against each contract&apos;s target level (dashed), so you can see
        whether price is heading toward where the money is. 3rd chart: signed
        <em> delta&nbsp;$</em> per minute — the option&apos;s price change that
        minute × that minute&apos;s volume × 100 (not cumulative; positive =
        contract richened on volume). 4th chart: <em>distance to target</em> =
        |target − SPY| for the two busiest calls and two busiest puts (faint)
        plus each side&apos;s average (bold), with SPY on the right axis — the
        smaller the line, the closer SPY is to that side&apos;s breakeven. Green
        = calls, red = puts. Top 10 by day total, refreshed every 5&nbsp;min.
      </p>
    </div>
  )
}
