'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const POLL_MS = 60_000

type Series = {
  label: string
  occ: string
  total: number
  points: [number, number][] // [minute_bucket (unix s), cumulative dollars]
}
type Payload = {
  status: string
  as_of?: string
  day?: string
  spot?: number
  minutes?: number
  series?: Series[]
  hint?: string
}

// 10 distinguishable hues that read on both themes
const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5',
]

const fmtM = (v: number) => `$${(v / 1e6).toFixed(1)}M`
const fmtTime = (unixSec: number) =>
  new Date(unixSec * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', hour12: false,
  })

export default function MoneyMoveChart() {
  const [data, setData] = useState<Payload | null>(null)

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

  const series = useMemo(() => data?.series ?? [], [data])

  // pivot: one row per minute, one column per contract
  const rows = useMemo(() => {
    const byT = new Map<number, Record<string, number>>()
    for (const s of series) {
      for (const [t, v] of s.points) {
        const row = byT.get(t) ?? { t }
        row[s.label] = v
        byT.set(t, row)
      }
    }
    return [...byT.values()].sort((a, b) => a.t - b.t)
  }, [series])

  if (!data || data.status !== 'ok' || !series.length) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
        No money-move data yet — it&apos;s recomputed every 5 minutes during market hours.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="h-80 w-full">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={fmtTime}
              tick={{ fontSize: 11 }}
              minTickGap={40}
            />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={60} />
            <Tooltip
              labelFormatter={(t) => `${fmtTime(Number(t))} ET`}
              formatter={(v: number, name) => [fmtM(v), name]}
              contentStyle={{ fontSize: 12 }}
              itemSorter={(i) => -(i.value as number)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((s, i) => (
              <Line
                key={s.occ}
                type="monotone"
                dataKey={s.label}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={1.75}
                dot={false}
                connectNulls
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
              <th className="py-1.5 pr-4">$ traded today</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s, i) => (
              <tr key={s.occ} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-1 pr-4">
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-sm align-middle"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {s.label}
                </td>
                <td className="py-1 pr-4 font-medium text-gray-900 dark:text-white">{fmtM(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Cumulative traded dollars per contract — each minute&apos;s new volume × its mid price × 100.
        Top 10 by day total. Updates every 5 minutes.
      </p>
    </div>
  )
}
