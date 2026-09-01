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
}
type Payload = {
  status: string
  as_of?: string
  day?: string
  spot?: number
  session_open?: number
  session_close?: number
  minutes?: number
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

  // right axis = the spread of the targets themselves (plus spot), tightly
  // fit so a cluster of near-money 0DTE breakevens stays readable; anything
  // pathologically far is clamped to the edge
  const priceDomain = useMemo<[number, number] | undefined>(() => {
    if (!hasTargets || spot == null) return undefined
    const vals = [spot, ...series.map((s) => s.breakeven)].sort((a, b) => a - b)
    // trim a lone far outlier so it can't stretch the scale
    const lo = Math.max(vals[0], spot * 0.9)
    const hi = Math.min(vals[vals.length - 1], spot * 1.1)
    const pad = Math.max((hi - lo) * 0.15, 0.5)
    return [lo - pad, hi + pad]
  }, [series, spot, hasTargets])

  const targets = useMemo(() => {
    if (!hasTargets || !priceDomain) return []
    const [lo, hi] = priceDomain
    return series.map((s) => ({ ...s, y: Math.min(hi, Math.max(lo, s.breakeven)) }))
  }, [series, hasTargets, priceDomain])

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
        Contracts <em>expiring today</em> only. Left axis: cumulative traded
        dollars per contract (each minute&apos;s new volume × mid × 100). Right
        axis dots: the underlying <em>target</em> — strike ± the option&apos;s
        price — where each contract breaks even by the close (exact values in
        the table). Green = calls, red = puts. Top 10 by day total, every 5&nbsp;min.
      </p>
    </div>
  )
}
