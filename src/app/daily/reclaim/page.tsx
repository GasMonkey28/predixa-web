'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AutoRefreshControls from '@/components/ui/AutoRefreshControls'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { EQUITY_TICKERS } from '@/lib/tickers'

type Signal = {
  side: 'long' | 'short'
  breach_date?: string
  overshoot?: number
  overshoot_pct?: number
  size?: number
  tier_bonus?: boolean
  y2y3_agree?: boolean
  entry_price?: number
  reclaim_price?: number
  flat_price?: number
  band_high?: number
  band_low?: number
  stop_pct?: number | null
  stop_price?: number | null
  exit_rule?: string
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
    long_flat_price?: number
    short_flat_price?: number
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

type RankedRow = {
  rank: number
  ticker: string
  as_of_date?: string
  signal: Signal
  long_tier?: string
  short_tier?: string
  y2y3_hands?: number
  win_rate_pct?: number
  win_n?: number
}

const TICKER_OPTIONS = ['SPY', ...EQUITY_TICKERS]

function money(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toFixed(2)
}

function pct(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `${Number(n).toFixed(2)}%`
}

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

function rankSignals(
  board: ReclaimPayload[],
  side: 'long' | 'short',
  winRates?: WinRatesPayload | null
): RankedRow[] {
  const rows: Omit<RankedRow, 'rank'>[] = []
  for (const row of board) {
    if (!row.ticker || row.fallback) continue
    for (const signal of row.signals || []) {
      if (signal.side !== side) continue
      const wr = winRates?.tickers?.[row.ticker]?.[side]
      rows.push({
        ticker: row.ticker,
        as_of_date: row.as_of_date,
        signal,
        long_tier: row.context?.long_tier,
        short_tier: row.context?.short_tier,
        y2y3_hands: row.context?.y2y3_hands,
        win_rate_pct: wr?.win_rate_pct,
        win_n: wr?.n,
      })
    }
  }
  rows.sort((a, b) => {
    const sizeDiff = (b.signal.size ?? 0) - (a.signal.size ?? 0)
    if (sizeDiff !== 0) return sizeDiff
    const pctDiff = (b.signal.overshoot_pct ?? 0) - (a.signal.overshoot_pct ?? 0)
    if (pctDiff !== 0) return pctDiff
    return a.ticker.localeCompare(b.ticker)
  })
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}

function RankedSignalTable({
  title,
  side,
  rows,
  onSelect,
}: {
  title: string
  side: 'long' | 'short'
  rows: RankedRow[]
  onSelect: (ticker: string) => void
}) {
  const accent = side === 'long' ? 'text-emerald-300' : 'text-rose-300'
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-5 overflow-x-auto">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className={`text-lg font-semibold ${accent}`}>{title}</h2>
        <span className="text-xs text-gray-500">ranked by size, then OS%</span>
      </div>
      <table className="min-w-full text-sm text-left">
        <thead className="text-gray-400 border-b border-gray-700">
          <tr>
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Ticker</th>
            <th className="py-2 pr-3">Size</th>
            <th className="py-2 pr-3">Win %</th>
            <th className="py-2 pr-3">n</th>
            <th className="py-2 pr-3">OS %</th>
            <th className="py-2 pr-3">OS $</th>
            <th className="py-2 pr-3">Flat @</th>
            <th className="py-2 pr-3">Entry</th>
            <th className="py-2 pr-3">Stop</th>
            <th className="py-2 pr-3">Breach</th>
            <th className="py-2 pr-3">Bonuses</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={12} className="py-4 text-gray-500">
                No {side} reclaim signals at this win% filter.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const s = row.signal
              return (
                <tr
                  key={`${row.ticker}-${s.breach_date}-${s.side}`}
                  className="border-b border-gray-800 hover:bg-gray-800/40 cursor-pointer"
                  onClick={() => onSelect(row.ticker)}
                >
                  <td className="py-2 pr-3 text-gray-500">{row.rank}</td>
                  <td className="py-2 pr-3 text-white font-medium">{row.ticker}</td>
                  <td className="py-2 pr-3 text-white font-semibold">
                    {(s.size ?? 0).toFixed(1)}x
                  </td>
                  <td className="py-2 pr-3 text-sky-300 font-semibold">
                    {row.win_rate_pct != null ? pct(row.win_rate_pct) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-gray-400">{row.win_n ?? '—'}</td>
                  <td className="py-2 pr-3 text-amber-300 font-semibold">{pct(s.overshoot_pct)}</td>
                  <td className="py-2 pr-3 text-gray-300">{money(s.overshoot)}</td>
                  <td className="py-2 pr-3 text-amber-200">{money(s.reclaim_price ?? s.flat_price)}</td>
                  <td className="py-2 pr-3 text-gray-300">{money(s.entry_price)}</td>
                  <td className="py-2 pr-3 text-gray-300">
                    {s.stop_price != null ? money(s.stop_price) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-gray-400">{s.breach_date || '—'}</td>
                  <td className="py-2 pr-3 text-gray-500">
                    {[s.tier_bonus ? '+tier' : null, s.y2y3_agree ? '+y2y3' : null]
                      .filter(Boolean)
                      .join(' ') || '—'}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function ReclaimPageContent() {
  const [ticker, setTicker] = useState('SPY')
  const [data, setData] = useState<ReclaimPayload | null>(null)
  const [board, setBoard] = useState<ReclaimPayload[]>([])
  const [winRates, setWinRates] = useState<WinRatesPayload | null>(null)
  const [minWinPctLong, setMinWinPctLong] = useState(80)
  const [minWinPctShort, setMinWinPctShort] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlightRef = useRef(false)
  const tickerRef = useRef(ticker)
  tickerRef.current = ticker

  const load = useCallback(async (t: string, opts?: { soft?: boolean }) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    const soft = opts?.soft === true
    if (soft) setRefreshing(true)
    else {
      setLoading(true)
      setError(null)
    }
    try {
      const [one, all] = await Promise.all([
        fetch(`/api/range-reclaim?ticker=${encodeURIComponent(t)}&t=${Date.now()}`).then((r) =>
          r.json()
        ),
        fetch(`/api/range-reclaim?board=1&t=${Date.now()}`).then((r) => r.json()),
      ])
      setData(one)
      setBoard(Array.isArray(all?.rows) ? all.rows : [])
      setWinRates(all?.win_rates ?? null)
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
    void load(ticker)
  }, [ticker, load])

  const softRefresh = useCallback(() => {
    void load(tickerRef.current, { soft: true })
  }, [load])

  const { autoRefresh, setAutoRefresh, intervalMs } = useAutoRefresh(softRefresh)

  const active = useMemo(() => data?.signals ?? [], [data])
  const longAll = useMemo(() => rankSignals(board, 'long', winRates), [board, winRates])
  const shortAll = useMemo(() => rankSignals(board, 'short', winRates), [board, winRates])
  const longRanked = useMemo(
    () =>
      longAll
        .filter((r) => r.win_rate_pct != null && r.win_rate_pct >= minWinPctLong)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [longAll, minWinPctLong]
  )
  const shortRanked = useMemo(
    () =>
      shortAll
        .filter((r) => r.win_rate_pct != null && r.win_rate_pct >= minWinPctShort)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [shortAll, minWinPctShort]
  )
  const detailWin = useMemo(() => {
    const t = data?.ticker || ticker
    return winRates?.tickers?.[t] ?? null
  }, [winRates, data?.ticker, ticker])

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
            Fade Model1 predicted high/low band breakouts. Long and short boards ranked by size,
            with exact overshoot %. Flat at band re-entry.
          </p>
        </motion.div>

        <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-gray-300 flex items-center gap-2">
              Ticker detail
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
            <label className="text-sm text-gray-300 flex items-center gap-2">
              Long min win %
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={minWinPctLong}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isNaN(v)) return
                  setMinWinPctLong(Math.min(100, Math.max(0, v)))
                }}
                className="w-20 rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2"
              />
            </label>
            <label className="text-sm text-gray-300 flex items-center gap-2">
              Short min win %
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={minWinPctShort}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isNaN(v)) return
                  setMinWinPctShort(Math.min(100, Math.max(0, v)))
                }}
                className="w-20 rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2"
              />
            </label>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>
              Longs{' '}
              <span className="text-emerald-300 font-medium">
                {longRanked.length}
              </span>
              <span className="text-gray-600">/{longAll.length}</span>
            </span>
            <span>
              Shorts{' '}
              <span className="text-rose-300 font-medium">
                {shortRanked.length}
              </span>
              <span className="text-gray-600">/{shortAll.length}</span>
            </span>
            {refreshing && <span className="text-blue-300">Updating…</span>}
            <AutoRefreshControls
              autoRefresh={autoRefresh}
              onAutoRefreshChange={setAutoRefresh}
              intervalMs={intervalMs}
              onRefresh={() => void load(ticker, { soft: Boolean(data || board.length) })}
              refreshing={loading || refreshing}
            />
          </div>
        </div>

        {!loading || board.length > 0 ? (
          <div className="grid gap-6 mb-10">
            <RankedSignalTable
              title={`Long reclaim (${longRanked.length} ≥ ${minWinPctLong}% win)`}
              side="long"
              rows={longRanked}
              onSelect={setTicker}
            />
            <RankedSignalTable
              title={`Short reclaim (${shortRanked.length} ≥ ${minWinPctShort}% win)`}
              side="short"
              rows={shortRanked}
              onSelect={setTicker}
            />
          </div>
        ) : null}

        {loading && board.length === 0 && <p className="text-gray-400 text-center py-12">Loading…</p>}
        {error && <p className="text-rose-400 text-center">{error}</p>}

        {!loading && data && (
          <div className="grid gap-6 lg:grid-cols-3 mb-10">
            <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-5 lg:col-span-1">
              <h2 className="text-white font-semibold mb-3">
                Detail · {data.ticker || ticker} · {data.as_of_date || '—'}
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
                    <dd className="text-white">{money(data.range?.prev_close)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Pred high / short flat</dt>
                    <dd className="text-rose-300">
                      {money(data.range?.short_flat_price ?? data.range?.pred_high)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Pred low / long flat</dt>
                    <dd className="text-emerald-300">
                      {money(data.range?.long_flat_price ?? data.range?.pred_low)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Min OS</dt>
                    <dd className="text-white">{money(data.range?.min_overshoot)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pt-2 border-t border-gray-700">
                    <dt>Hist long win</dt>
                    <dd className="text-sky-300">
                      {detailWin?.long?.win_rate_pct != null
                        ? `${pct(detailWin.long.win_rate_pct)} (n=${detailWin.long.n ?? '—'})`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Hist short win</dt>
                    <dd className="text-sky-300">
                      {detailWin?.short?.win_rate_pct != null
                        ? `${pct(detailWin.short.win_rate_pct)} (n=${detailWin.short.n ?? '—'})`
                        : '—'}
                    </dd>
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
              <h2 className="text-white font-semibold mb-3">Active signals (this ticker)</h2>
              {active.length === 0 ? (
                <div className="space-y-3 text-sm">
                  <p className="text-gray-400">No reclaim breach for this as-of window.</p>
                  <p className="text-gray-300">
                    Band flat targets: long flat @{' '}
                    <span className="text-amber-300 font-semibold">
                      {money(data.range?.long_flat_price ?? data.range?.pred_low)}
                    </span>
                    {' · '}short flat @{' '}
                    <span className="text-amber-300 font-semibold">
                      {money(data.range?.short_flat_price ?? data.range?.pred_high)}
                    </span>
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {active.map((s) => (
                    <li
                      key={`${s.side}-${s.breach_date}`}
                      className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <SideBadge side={s.side} />
                        <span className="text-white font-medium">size {(s.size ?? 0).toFixed(1)}x</span>
                        <span className="text-amber-300 font-semibold">{pct(s.overshoot_pct)}</span>
                        {s.tier_bonus ? (
                          <span className="text-xs text-sky-300">+tier</span>
                        ) : null}
                        {s.y2y3_agree ? (
                          <span className="text-xs text-violet-300">+y2y3</span>
                        ) : null}
                      </div>
                      <p className="text-lg text-white font-semibold tracking-tight">
                        Flat / reclaim @{' '}
                        <span className="text-amber-300">
                          {money(s.reclaim_price ?? s.flat_price)}
                        </span>
                        {s.side === 'long' ? (
                          <span className="text-sm font-normal text-gray-400"> (pred low)</span>
                        ) : (
                          <span className="text-sm font-normal text-gray-400"> (pred high)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-300 mt-1">
                        Entry ~{money(s.entry_price)}
                        {s.stop_price != null ? ` · stop ${money(s.stop_price)}` : ' · no stop'}
                        {' · '}Breach {s.breach_date} · OS ${money(s.overshoot)} ({pct(s.overshoot_pct)})
                      </p>
                      {s.exit_rule ? (
                        <p className="text-xs text-sky-200/80 mt-1">{s.exit_rule}</p>
                      ) : null}
                      {s.note ? <p className="text-xs text-gray-500 mt-1">{s.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-500 max-w-3xl">
          OS % = overshoot beyond the Model1 band vs prev close. Rank = size first (1.0 / 1.5 /
          2.0), then higher OS %. Long min win % defaults to 80; short defaults to 0 (both
          editable). Win % = historical backtest under production reclaim rules (long: no stop
          to band; short: 1% stop, unfiltered base). Sample size shown as n.
          {winRates?.rules?.note ? ` ${winRates.rules.note}` : ''}
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
