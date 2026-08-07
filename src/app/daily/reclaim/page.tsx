'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { EQUITY_TICKERS } from '@/lib/tickers'

type Signal = {
  side: 'long' | 'short'
  breach_date?: string
  overshoot?: number
  overshoot_pct?: number
  size?: number
  tier_bonus?: boolean
  y2y3_agree?: boolean
  stop_pct?: number | null
  note?: string
}

type ReclaimPayload = {
  ticker?: string
  as_of_date?: string
  status?: string
  fallback?: boolean
  error?: string
  hint?: string
  range?: {
    prev_close?: number
    pred_high?: number
    pred_low?: number
    min_overshoot?: number
    os_pct?: number
  }
  context?: {
    long_tier?: string
    short_tier?: string
    y2y3_hands?: number
    y2y3_signal?: string
  }
  signals?: Signal[]
  primary?: Signal | null
}

const TICKER_OPTIONS = ['SPY', ...EQUITY_TICKERS]

function SideBadge({ side }: { side: string }) {
  const long = side === 'long'
  return (
    <span
      className={
        long
          ? 'rounded px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300'
          : 'rounded px-2 py-0.5 text-xs font-semibold bg-rose-500/20 text-rose-300'
      }
    >
      {long ? 'LONG reclaim' : 'SHORT reclaim'}
    </span>
  )
}

function ReclaimPageContent() {
  const [ticker, setTicker] = useState('SPY')
  const [data, setData] = useState<ReclaimPayload | null>(null)
  const [board, setBoard] = useState<ReclaimPayload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (t: string) => {
    setLoading(true)
    setError(null)
    try {
      const [one, all] = await Promise.all([
        fetch(`/api/range-reclaim?ticker=${encodeURIComponent(t)}&t=${Date.now()}`).then((r) =>
          r.json()
        ),
        fetch(`/api/range-reclaim?board=1&t=${Date.now()}`).then((r) => r.json()),
      ])
      setData(one)
      setBoard(Array.isArray(all?.rows) ? all.rows : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(ticker)
  }, [ticker, load])

  const active = useMemo(() => data?.signals ?? [], [data])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <div className="relative mx-auto max-w-7xl p-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Model Reclaim</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Fade Model1 predicted high/low band breakouts. Size up when tier and y2y3 agree on
            longs. Shorts use a 1% stop; longs hold to band re-entry.
          </p>
        </motion.div>

        <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
          <label className="text-sm text-gray-300 flex items-center gap-2">
            Ticker
            <select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2"
            >
              {TICKER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => load(ticker)}
            className="rounded-md bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-sm"
          >
            Refresh
          </button>
        </div>

        {loading && <p className="text-gray-400 text-center py-12">Loading…</p>}
        {error && <p className="text-rose-400 text-center">{error}</p>}

        {!loading && data && (
          <div className="grid gap-6 lg:grid-cols-3 mb-10">
            <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-5 lg:col-span-1">
              <h2 className="text-white font-semibold mb-3">
                {data.ticker || ticker} · {data.as_of_date || '—'}
              </h2>
              {data.fallback || data.status === 'missing' ? (
                <p className="text-amber-300 text-sm">
                  No feeder yet. Deploy <code className="text-amber-200">predixa-range-reclaim</code>{' '}
                  and run Daily through Range Reclaim.
                  {data.hint ? <span className="block mt-2 text-gray-400">{data.hint}</span> : null}
                </p>
              ) : (
                <dl className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between gap-4">
                    <dt>Prev close</dt>
                    <dd className="text-white">{data.range?.prev_close ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Pred high</dt>
                    <dd className="text-rose-300">{data.range?.pred_high ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Pred low</dt>
                    <dd className="text-emerald-300">{data.range?.pred_low ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Min OS</dt>
                    <dd className="text-white">{data.range?.min_overshoot ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pt-2 border-t border-gray-700">
                    <dt>Long tier</dt>
                    <dd>{data.context?.long_tier ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Short tier</dt>
                    <dd>{data.context?.short_tier ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>y2y3 hands</dt>
                    <dd>{data.context?.y2y3_hands ?? '—'}</dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-5 lg:col-span-2">
              <h2 className="text-white font-semibold mb-3">Active signals</h2>
              {active.length === 0 ? (
                <p className="text-gray-400 text-sm">No reclaim breach for this as-of window.</p>
              ) : (
                <ul className="space-y-3">
                  {active.map((s) => (
                    <li
                      key={`${s.side}-${s.breach_date}`}
                      className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <SideBadge side={s.side} />
                        <span className="text-white font-medium">size {s.size?.toFixed(1)}x</span>
                        {s.tier_bonus ? (
                          <span className="text-xs text-sky-300">+tier</span>
                        ) : null}
                        {s.y2y3_agree ? (
                          <span className="text-xs text-violet-300">+y2y3</span>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-300">
                        Breach {s.breach_date} · OS {s.overshoot?.toFixed?.(2) ?? s.overshoot} (
                        {s.overshoot_pct?.toFixed?.(2) ?? s.overshoot_pct}%)
                        {s.stop_pct != null ? ` · stop ${(s.stop_pct * 100).toFixed(0)}%` : ' · no stop'}
                      </p>
                      {s.note ? <p className="text-xs text-gray-500 mt-1">{s.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-5 overflow-x-auto">
          <h2 className="text-white font-semibold mb-3">Board (latest feeders)</h2>
          <table className="min-w-full text-sm text-left">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="py-2 pr-4">Ticker</th>
                <th className="py-2 pr-4">As of</th>
                <th className="py-2 pr-4">Signal</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Tier / y2y3</th>
              </tr>
            </thead>
            <tbody>
              {board.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-500">
                    No board rows yet.
                  </td>
                </tr>
              ) : (
                board.map((row) => {
                  const primary = row.primary || row.signals?.[0]
                  return (
                    <tr
                      key={row.ticker}
                      className="border-b border-gray-800 hover:bg-gray-800/40 cursor-pointer"
                      onClick={() => row.ticker && setTicker(row.ticker)}
                    >
                      <td className="py-2 pr-4 text-white font-medium">{row.ticker}</td>
                      <td className="py-2 pr-4 text-gray-300">{row.as_of_date || '—'}</td>
                      <td className="py-2 pr-4">
                        {primary ? <SideBadge side={primary.side} /> : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-200">
                        {primary?.size != null ? `${primary.size.toFixed(1)}x` : '—'}
                      </td>
                      <td className="py-2 pr-4 text-gray-400">
                        {row.context?.long_tier || '—'}/{row.context?.short_tier || '—'} · hands{' '}
                        {row.context?.y2y3_hands ?? '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-gray-500 max-w-3xl">
          Research notes live privately under <code>tradespark/range_reclaim/README.md</code>. Step
          Function backups for reverse:{' '}
          <code>infrastructure/step-functions/_backups/pre-range-reclaim_*</code>.
        </p>
      </div>
    </div>
  )
}

export default function ReclaimPage() {
  return (
    <ProtectedRoute requireSubscription>
      <ReclaimPageContent />
    </ProtectedRoute>
  )
}
