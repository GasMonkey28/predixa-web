'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { fetchAuthSession } from 'aws-amplify/auth'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AutoRefreshControls from '@/components/ui/AutoRefreshControls'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { formatSignedPct } from '@/lib/dt-quotes'
import { EQUITY_TICKERS } from '@/lib/tickers'

type WinRateSide = {
  win_rate_pct?: number
  n?: number
  avg_pnl_pct?: number | null
  avg_hold?: number | null
}

type WinRatesPayload = {
  tickers?: Record<string, { long?: WinRateSide; short?: WinRateSide }>
  rules?: { note?: string; long?: string; short?: string }
}

type FeederRow = {
  ticker?: string
  as_of_date?: string
  price_as_of?: string
  fallback?: boolean
  status?: string
  last?: number
  open?: number
  low?: number
  high?: number
  net_change?: number
  net_change_pct?: number
  range?: {
    prev_close?: number
    pred_high?: number
    pred_low?: number
    long_flat_price?: number
    min_overshoot?: number
    os_pct?: number
  }
  context?: {
    long_tier?: string
    y2y3_hands?: number
    y2y3_signal?: string
  }
}

type LiveLongRow = {
  rank: number
  ticker: string
  as_of_date?: string
  price_as_of?: string
  last?: number
  low?: number
  open?: number
  net_change_pct?: number
  pred_low: number
  flat_at: number
  min_overshoot: number
  overshoot: number
  overshoot_pct: number
  win_rate_pct?: number
  win_n?: number
  long_tier?: string
  y2y3_hands?: number
}

function money(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toFixed(2)
}

function pct(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `${Number(n).toFixed(2)}%`
}

function ChangePctCell({ value }: { value?: number }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-gray-500">—</span>
  }
  const positive = value >= 0
  return (
    <span
      className={`tabular-nums font-medium ${
        positive ? 'text-emerald-400' : 'text-rose-400'
      }`}
    >
      {formatSignedPct(value)}
    </span>
  )
}

/**
 * Live long reclaim-at-close: today's band breached on the live low,
 * and last still outside (below pred_low) so a close print can be the entry.
 */
function buildLiveLongCloseRows(
  board: FeederRow[],
  winRates: WinRatesPayload | null,
  minWinPct: number
): LiveLongRow[] {
  const rows: Omit<LiveLongRow, 'rank'>[] = []
  for (const row of board) {
    if (!row.ticker || row.fallback) continue
    const predLow =
      row.range?.long_flat_price ?? row.range?.pred_low ?? null
    const minOs = row.range?.min_overshoot
    const prev = row.range?.prev_close
    if (predLow == null || minOs == null || !Number.isFinite(predLow) || !Number.isFinite(minOs)) {
      continue
    }
    const last = row.last
    const low = row.low ?? last
    if (last == null || low == null || !Number.isFinite(last) || !Number.isFinite(low)) {
      continue
    }
    // Must still be outside the band at last (close-entry thesis).
    if (!(last < predLow)) continue
    const overshoot = predLow - low
    if (!(overshoot >= minOs)) continue

    const wr = winRates?.tickers?.[row.ticker]?.long
    const winPct = wr?.win_rate_pct
    if (winPct == null || !Number.isFinite(winPct) || winPct < minWinPct) continue

    const overshootPct =
      prev != null && prev > 0 ? (100.0 * overshoot) / prev : Number.NaN

    rows.push({
      ticker: row.ticker,
      as_of_date: row.as_of_date,
      price_as_of: row.price_as_of,
      last,
      low,
      open: row.open,
      net_change_pct: row.net_change_pct,
      pred_low: predLow,
      flat_at: predLow,
      min_overshoot: minOs,
      overshoot,
      overshoot_pct: overshootPct,
      win_rate_pct: winPct,
      win_n: wr?.n,
      long_tier: row.context?.long_tier,
      y2y3_hands: row.context?.y2y3_hands,
    })
  }

  rows.sort((a, b) => {
    const os = (b.overshoot_pct || 0) - (a.overshoot_pct || 0)
    if (os !== 0) return os
    const wr = (b.win_rate_pct || 0) - (a.win_rate_pct || 0)
    if (wr !== 0) return wr
    return a.ticker.localeCompare(b.ticker)
  })

  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}

function ReclaimClosePageContent() {
  const [board, setBoard] = useState<FeederRow[]>([])
  const [winRates, setWinRates] = useState<WinRatesPayload | null>(null)
  const [minWinPct, setMinWinPct] = useState(80)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotesOk, setQuotesOk] = useState(false)
  const inFlightRef = useRef(false)

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    const soft = opts?.soft === true
    if (soft) setRefreshing(true)
    else {
      setLoading(true)
      setError(null)
    }
    try {
      const headers: HeadersInit = {}
      try {
        const session = await fetchAuthSession()
        const idToken = session.tokens?.idToken?.toString()
        if (idToken) headers.Authorization = `Bearer ${idToken}`
      } catch {
        // Quotes need auth; without them live breach filter is empty.
      }
      const all = await fetch(`/api/range-reclaim?board=1&t=${Date.now()}`, {
        headers,
      }).then((r) => r.json())
      const rows: FeederRow[] = Array.isArray(all?.rows) ? all.rows : []
      setBoard(rows)
      setWinRates(all?.win_rates ?? null)
      setQuotesOk(rows.some((r) => r.last != null || r.low != null))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      inFlightRef.current = false
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const softRefresh = useCallback(() => {
    void load({ soft: true })
  }, [load])

  const { autoRefresh, setAutoRefresh, intervalMs } = useAutoRefresh(softRefresh)

  const ranked = useMemo(
    () => buildLiveLongCloseRows(board, winRates, minWinPct),
    [board, winRates, minWinPct]
  )

  const asOf = useMemo(() => {
    const dates = board.map((r) => r.as_of_date).filter(Boolean) as string[]
    return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null
  }, [board])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <div className="relative mx-auto max-w-7xl p-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Model Reclaim-at Close (Long)
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Live filter: names whose day low has already broken below today&apos;s Model1{' '}
            <span className="text-emerald-300">pred_low</span> by the min overshoot, and last is
            still below the band — plan to buy near/at the close. Flat @ pred_low (band re-entry).
            Research favored same-day close entry for longs vs next open.
          </p>
        </motion.div>

        <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-gray-300 flex items-center gap-2">
              Min win %
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={minWinPct}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isNaN(v)) return
                  setMinWinPct(Math.min(100, Math.max(0, v)))
                }}
                className="w-20 rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2"
              />
            </label>
            <span className="text-sm text-gray-400">
              {ranked.length} live long
              <span className="text-gray-600"> · {EQUITY_TICKERS.length + 1} scanned</span>
            </span>
            {asOf ? (
              <span className="text-sm text-gray-400">
                Band as_of <span className="font-mono text-emerald-300/90">{asOf}</span>
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/daily/reclaim"
              className="text-sm text-blue-300 hover:text-blue-200"
            >
              Classic Model Reclaim →
            </Link>
            <AutoRefreshControls
              autoRefresh={autoRefresh}
              onAutoRefreshChange={setAutoRefresh}
              intervalMs={intervalMs}
              refreshing={refreshing}
              onRefresh={() => void load({ soft: true })}
            />
          </div>
        </div>

        {loading && <p className="text-center text-gray-400 mb-6">Loading live reclaim board…</p>}
        {error && <p className="text-rose-400 text-center mb-6">{error}</p>}
        {!loading && !quotesOk && (
          <p className="text-amber-300 text-center text-sm mb-6">
            No live quotes attached — connect TradeStation (subscriber) so Low/Last can detect
            breaches. Without quotes this list stays empty.
          </p>
        )}

        <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-5 overflow-x-auto mb-8">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-emerald-300">
              Live long breach ({ranked.length} ≥ {minWinPct}% win)
            </h2>
            <span className="text-xs text-gray-500">ranked by live OS%, then win%</span>
          </div>
          <table className="min-w-full text-sm text-left">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Ticker</th>
                <th className="py-2 pr-3">Win %</th>
                <th className="py-2 pr-3">n</th>
                <th className="py-2 pr-3">Chg %</th>
                <th className="py-2 pr-3">Last</th>
                <th className="py-2 pr-3">Low</th>
                <th className="py-2 pr-3">OS %</th>
                <th className="py-2 pr-3">OS $</th>
                <th className="py-2 pr-3">Flat @</th>
                <th className="py-2 pr-3">Entry</th>
                <th className="py-2 pr-3">Tier</th>
              </tr>
            </thead>
            <tbody>
              {ranked.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-4 text-gray-500">
                    No live long breaches at this win% filter
                    {quotesOk ? ' right now.' : ' (need live quotes).'}
                  </td>
                </tr>
              ) : (
                ranked.map((row) => (
                  <tr
                    key={row.ticker}
                    className="border-b border-gray-800 hover:bg-gray-800/40"
                  >
                    <td className="py-2 pr-3 text-gray-500">{row.rank}</td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/tickers/insight?ticker=${encodeURIComponent(row.ticker)}`}
                        className="font-medium text-blue-300 hover:text-blue-200"
                      >
                        {row.ticker}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-sky-300 font-semibold">
                      {row.win_rate_pct != null ? pct(row.win_rate_pct) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-gray-400">{row.win_n ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <ChangePctCell value={row.net_change_pct} />
                    </td>
                    <td className="py-2 pr-3 text-white tabular-nums">{money(row.last)}</td>
                    <td className="py-2 pr-3 text-rose-200 tabular-nums">{money(row.low)}</td>
                    <td className="py-2 pr-3 text-amber-300 font-semibold">
                      {Number.isFinite(row.overshoot_pct) ? pct(row.overshoot_pct) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-gray-300">{money(row.overshoot)}</td>
                    <td className="py-2 pr-3 text-amber-200">{money(row.flat_at)}</td>
                    <td className="py-2 pr-3 text-emerald-200/90 text-xs">at close</td>
                    <td className="py-2 pr-3 text-gray-400">{row.long_tier || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 max-w-3xl mx-auto text-center">
          Not the 3-day historical feeder list — only names with a <em>live</em> low breach of
          today&apos;s pred_low that are still below the band. Win % is the historical long reclaim
          backtest (same-day close research path). Paper / discretionary only — not investment
          advice.
        </p>
      </div>
    </div>
  )
}

export default function ReclaimClosePage() {
  return (
    <ProtectedRoute requireSubscription>
      <ReclaimClosePageContent />
    </ProtectedRoute>
  )
}
