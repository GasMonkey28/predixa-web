'use client'

import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const POLL_MS = 20_000

type TermPoint = {
  expiration: string
  dte: number
  fwd: number | null
  fwd_method: string
  atm_iv: number | null
  call_oi: number
  put_oi: number
  call_vol: number
  put_vol: number
}

type ChainRow = {
  expiration: string
  dte: number
  strike: number
  type: 'C' | 'P'
  bid: number | null
  ask: number | null
  mid: number | null
  last: number | null
  volume: number
  oi: number
  iv: number | null
  delta: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
  stale: boolean
}

type Payload = {
  status: string
  as_of?: string
  spot?: number
  capture_lag_s?: number | null
  scope?: { expirations: number; rows: number; iv_coverage: number | null }
  aggregates?: {
    total_call_volume: number
    total_put_volume: number
    put_call_volume_ratio: number | null
  }
  term_structure?: TermPoint[]
  chain?: ChainRow[]
  hint?: string
}

const n2 = (v?: number | null) => (v == null || Number.isNaN(v) ? '—' : v.toFixed(2))
const n3 = (v?: number | null) => (v == null || Number.isNaN(v) ? '—' : v.toFixed(3))
const pct = (v?: number | null) => (v == null || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(1)}%`)
const int = (v?: number | null) => (v == null || Number.isNaN(v) ? '—' : Math.round(v).toLocaleString())

function ago(iso?: string) {
  if (!iso) return '—'
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 90) return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
}

export default function OptionChainLive() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [exp, setExp] = useState<string | null>(null)
  const [tick, setTick] = useState(0) // re-render for the "Xs ago" label

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/option-chain', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d: Payload) => {
          if (!cancelled) setData(d)
        })
        .catch(() => {
          if (!cancelled) setData({ status: 'missing', hint: 'network error' })
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }
    load()
    const poll = setInterval(load, POLL_MS)
    const clock = setInterval(() => setTick((t) => t + 1), 5_000)
    return () => {
      cancelled = true
      clearInterval(poll)
      clearInterval(clock)
    }
  }, [])

  const term = useMemo(() => data?.term_structure ?? [], [data])
  const spot = data?.spot ?? null
  const firstExp = term[0]?.expiration ?? null

  useEffect(() => {
    setExp((cur) => cur ?? firstExp)
  }, [firstExp])

  const rows = useMemo(() => {
    const chain = data?.chain ?? []
    const forExp = chain.filter((r) => r.expiration === exp)
    const byStrike = new Map<number, { C?: ChainRow; P?: ChainRow }>()
    for (const r of forExp) {
      const e = byStrike.get(r.strike) ?? {}
      e[r.type] = r
      byStrike.set(r.strike, e)
    }
    return [...byStrike.entries()].sort((a, b) => a[0] - b[0])
  }, [data, exp])

  const atmStrike = useMemo(() => {
    if (spot == null || !rows.length) return null
    return rows.reduce((best, [k]) => (Math.abs(k - spot) < Math.abs(best - spot) ? k : best), rows[0][0])
  }, [rows, spot])

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading live chain…</div>
  }

  if (!data || data.status !== 'ok') {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-gray-600 dark:text-gray-400">
        <p className="font-medium text-gray-900 dark:text-white">No live snapshot right now.</p>
        <p className="mt-1 text-sm">
          The recorder writes a new snapshot every minute from 9:30–16:00 ET. Outside
          market hours this is expected.
        </p>
        {data?.hint && <p className="mt-2 text-xs text-gray-400">{data.hint}</p>}
      </div>
    )
  }

  const agg = data.aggregates
  const anyStale = (data.chain ?? []).some((r) => r.stale)

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400">SPY spot</div>
          <div className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
            {n2(data.spot)}
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <div>
            snapshot <span className="tabular-nums">{ago(data.as_of)}</span>
            <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
            {data.scope?.rows.toLocaleString()} contracts · {data.scope?.expirations} expirations
          </div>
          <div className="mt-0.5">
            IV coverage {pct(data.scope?.iv_coverage)}
            {agg?.put_call_volume_ratio != null && (
              <>
                <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
                put/call vol {agg.put_call_volume_ratio.toFixed(2)}
              </>
            )}
          </div>
        </div>
        {anyStale && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            some quotes stale — market likely closed
          </span>
        )}
      </div>

      {/* term structure */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          ATM implied-volatility term structure
        </h3>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <LineChart data={term} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="dte"
                tick={{ fontSize: 12 }}
                label={{ value: 'days to expiry', position: 'insideBottom', offset: -2, fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tick={{ fontSize: 12 }}
                width={48}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, 'ATM IV']}
                labelFormatter={(l) => `${l} DTE`}
              />
              <Line type="monotone" dataKey="atm_iv" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2 pr-4">Expiration</th>
                <th className="py-2 pr-4">DTE</th>
                <th className="py-2 pr-4">Forward</th>
                <th className="py-2 pr-4">ATM IV</th>
                <th className="py-2 pr-4">Call vol</th>
                <th className="py-2 pr-4">Put vol</th>
                <th className="py-2 pr-4">Call OI</th>
                <th className="py-2 pr-4">Put OI</th>
              </tr>
            </thead>
            <tbody>
              {term.map((t) => (
                <tr
                  key={t.expiration}
                  className={clsx(
                    'border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    t.expiration === exp && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => setExp(t.expiration)}
                >
                  <td className="py-1.5 pr-4">{t.expiration}</td>
                  <td className="py-1.5 pr-4">{t.dte}</td>
                  <td className="py-1.5 pr-4">{n2(t.fwd)}</td>
                  <td className="py-1.5 pr-4 font-medium text-gray-900 dark:text-white">{pct(t.atm_iv)}</td>
                  <td className="py-1.5 pr-4">{int(t.call_vol)}</td>
                  <td className="py-1.5 pr-4">{int(t.put_vol)}</td>
                  <td className="py-1.5 pr-4">{int(t.call_oi)}</td>
                  <td className="py-1.5 pr-4">{int(t.put_oi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* chain */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Chain
          </h3>
          <div className="flex flex-wrap gap-1">
            {term.map((t) => (
              <button
                key={t.expiration}
                onClick={() => setExp(t.expiration)}
                className={clsx(
                  'rounded px-2 py-1 text-xs font-medium',
                  t.expiration === exp
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                {t.expiration.slice(5)} · {t.dte}d
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs tabular-nums">
            <thead>
              <tr className="text-gray-400">
                <th colSpan={6} className="border-b border-gray-200 py-1 text-center font-semibold uppercase tracking-wide dark:border-gray-700">
                  Calls
                </th>
                <th className="border-b border-gray-200 dark:border-gray-700" />
                <th colSpan={6} className="border-b border-gray-200 py-1 text-center font-semibold uppercase tracking-wide dark:border-gray-700">
                  Puts
                </th>
              </tr>
              <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-wide text-gray-400 dark:border-gray-700">
                <th className="py-1.5 pr-3">Bid</th>
                <th className="py-1.5 pr-3">Ask</th>
                <th className="py-1.5 pr-3">IV</th>
                <th className="py-1.5 pr-3">Δ</th>
                <th className="py-1.5 pr-3">Vol</th>
                <th className="py-1.5 pr-3">OI</th>
                <th className="py-1.5 px-3 text-center text-gray-900 dark:text-white">Strike</th>
                <th className="py-1.5 pr-3">Bid</th>
                <th className="py-1.5 pr-3">Ask</th>
                <th className="py-1.5 pr-3">IV</th>
                <th className="py-1.5 pr-3">Δ</th>
                <th className="py-1.5 pr-3">Vol</th>
                <th className="py-1.5 pr-3">OI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([strike, { C, P }]) => {
                const isAtm = strike === atmStrike
                return (
                  <tr
                    key={strike}
                    className={clsx(
                      'border-b border-gray-100 dark:border-gray-800',
                      isAtm && 'bg-blue-50/70 dark:bg-blue-900/20'
                    )}
                  >
                    <td className={clsx('py-1 pr-3', C?.stale && 'text-gray-400')}>{n2(C?.bid)}</td>
                    <td className={clsx('py-1 pr-3', C?.stale && 'text-gray-400')}>{n2(C?.ask)}</td>
                    <td className="py-1 pr-3">{pct(C?.iv)}</td>
                    <td className="py-1 pr-3">{n3(C?.delta)}</td>
                    <td className="py-1 pr-3">{int(C?.volume)}</td>
                    <td className="py-1 pr-3">{int(C?.oi)}</td>
                    <td className={clsx(
                      'py-1 px-3 text-center font-semibold',
                      isAtm ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                    )}>
                      {strike.toFixed(0)}
                    </td>
                    <td className={clsx('py-1 pr-3', P?.stale && 'text-gray-400')}>{n2(P?.bid)}</td>
                    <td className={clsx('py-1 pr-3', P?.stale && 'text-gray-400')}>{n2(P?.ask)}</td>
                    <td className="py-1 pr-3">{pct(P?.iv)}</td>
                    <td className="py-1 pr-3">{n3(P?.delta)}</td>
                    <td className="py-1 pr-3">{int(P?.volume)}</td>
                    <td className="py-1 pr-3">{int(P?.oi)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400">
          Greeks and IV are computed from the quote mid with a forward-based
          Black-76 model (forward &amp; discount implied from put-call parity). Updates every minute.
        </p>
      </section>
    </div>
  )
}
