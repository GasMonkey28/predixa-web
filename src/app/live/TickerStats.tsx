'use client'

import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  Bar, Cell, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

const POLL_MS = 5 * 60_000
const UP = '#16a34a'
const DOWN = '#dc2626'

type Tiers = {
  date?: string
  long_tier?: string
  short_tier?: string
  long_score?: number
  short_score?: number
  confidence?: string
  risk?: string
  prev_long_tier?: string
  prev_short_tier?: string
}
type Y2y3Today = {
  date?: string
  final_signal?: string
  position_size?: number
  pred_y1?: number
  pred_y2_plus_y3?: number
}
type Y2y3 = {
  today?: Y2y3Today
  trading_days?: { pred_y2_plus_y3?: number }[]
  requested_date?: string
  requested_date_found?: boolean
}
type Bar_ = { date: string; o: number; h: number; l: number; c: number }

const gradeColor = (g?: string) => {
  const k = (g || '').trim().toUpperCase()[0]
  if (k === 'A') return 'text-emerald-500'
  if (k === 'B') return 'text-sky-400'
  if (k === 'C') return 'text-amber-400'
  if (k === 'D' || k === 'F') return 'text-rose-500'
  return 'text-gray-400'
}
const sigStyle = (s?: string) =>
  s === 'long'
    ? 'bg-emerald-600 text-white'
    : s === 'short'
      ? 'bg-rose-600 text-white'
      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'

export default function TickerStats({
  symbol,
  showOhlc = true,
  date,
}: {
  symbol: string
  showOhlc?: boolean
  /** ISO date (YYYY-MM-DD) to show tier/y2y3 as of that day instead of live.
   *  Tiers has full history; y2y3 only as far back as its rolling 40-day
   *  window. The 40-day OHLC chart isn't date-aware (always "most recent
   *  40 days") since it's just chart context, not itself the thing being
   *  looked up historically. */
  date?: string | null
}) {
  const [tiers, setTiers] = useState<Tiers | null>(null)
  const [y2y3, setY2y3] = useState<Y2y3 | null>(null)
  const [ohlc, setOhlc] = useState<Bar_[] | null>(null)

  useEffect(() => {
    let dead = false
    setTiers(null)
    setY2y3(null)
    setOhlc(null)
    const q = `?ticker=${encodeURIComponent(symbol)}`
    const dq = `${q}${date ? `&date=${encodeURIComponent(date)}` : ''}`
    const load = () => {
      fetch(`/api/tiers/daily${dq}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => !dead && setTiers(d))
        .catch(() => {})
      fetch(`/api/model2/daily${dq}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => !dead && setY2y3(d))
        .catch(() => {})
      if (showOhlc)
        fetch(`/api/ohlc-40${q}`, { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => !dead && setOhlc(d?.bars ?? []))
          .catch(() => {})
    }
    load()
    if (date) return () => { dead = true }
    const id = setInterval(load, POLL_MS)
    return () => {
      dead = true
      clearInterval(id)
    }
  }, [symbol, showOhlc, date])

  const candles = useMemo(
    () =>
      (ohlc ?? []).map((b) => ({
        ...b,
        wick: [b.l, b.h] as [number, number],
        body: [Math.min(b.o, b.c), Math.max(b.o, b.c)] as [number, number],
        up: b.c >= b.o,
      })),
    [ohlc]
  )
  const yDomain = useMemo<[number, number] | undefined>(() => {
    if (!candles.length) return undefined
    const lo = Math.min(...candles.map((c) => c.l))
    const hi = Math.max(...candles.map((c) => c.h))
    const pad = (hi - lo) * 0.06
    return [lo - pad, hi + pad]
  }, [candles])

  const t = y2y3?.today
  const y = t?.pred_y2_plus_y3
  const last = ohlc?.[ohlc.length - 1]
  const first = ohlc?.[0]
  const chg = last && first ? ((last.c - first.c) / first.c) * 100 : null

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-400">{symbol} — tier</div>
        {tiers && tiers.long_tier ? (
          <div className="mt-1 flex gap-6">
            <div>
              <span className="text-xs text-gray-400">long </span>
              <span className={clsx('text-2xl font-bold tabular-nums', gradeColor(tiers.long_tier))}>
                {tiers.long_tier}
              </span>
              <span className="ml-1 text-xs text-gray-400 tabular-nums">
                {tiers.long_score != null ? tiers.long_score.toFixed(2) : ''}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400">short </span>
              <span className={clsx('text-2xl font-bold tabular-nums', gradeColor(tiers.short_tier))}>
                {tiers.short_tier}
              </span>
              <span className="ml-1 text-xs text-gray-400 tabular-nums">
                {tiers.short_score != null ? tiers.short_score.toFixed(2) : ''}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-1 text-xs text-gray-500">no tier data</div>
        )}
        {tiers?.confidence && (
          <div className="mt-0.5 text-xs text-gray-400">
            {tiers.confidence} confidence · {tiers.risk}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-gray-400">y2 + y3 model</div>
        {t && Object.keys(t).length ? (
          <div className="mt-1 flex items-center gap-3">
            <span
              className={clsx(
                'text-2xl font-bold tabular-nums',
                y == null ? 'text-gray-400' : y >= 0 ? 'text-emerald-500' : 'text-rose-500'
              )}
            >
              {y == null ? '—' : `${y >= 0 ? '+' : ''}${y.toFixed(2)}`}
            </span>
            <span className={clsx('rounded px-2 py-0.5 text-xs font-semibold', sigStyle(t.final_signal))}>
              {t.final_signal === 'no_trade' || !t.final_signal
                ? 'no trade'
                : `${t.final_signal}${t.position_size ? ` ×${t.position_size}` : ''}`}
            </span>
          </div>
        ) : (
          <div className="mt-1 text-xs text-gray-500">no model data</div>
        )}
        {t?.pred_y1 != null && (
          <div className="mt-0.5 text-xs text-gray-400 tabular-nums">
            y1 {t.pred_y1 >= 0 ? '+' : ''}
            {t.pred_y1.toFixed(2)}
          </div>
        )}
        {y2y3?.requested_date_found === false && (
          <div className="mt-0.5 text-xs text-amber-500">
            no y2y3 data for {y2y3.requested_date} (only ~40 trading days kept) — showing live instead
          </div>
        )}
      </div>

      {showOhlc && (
      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs uppercase tracking-wide text-gray-400">40-day OHLC</div>
          {chg != null && (
            <div className={clsx('text-xs font-medium tabular-nums', chg >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {chg >= 0 ? '+' : ''}
              {chg.toFixed(1)}%
            </div>
          )}
        </div>
        <div className="mt-1 h-40 w-full">
          {candles.length ? (
            <ResponsiveContainer>
              <ComposedChart data={candles} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
                <XAxis dataKey="date" hide />
                <YAxis
                  domain={yDomain ?? ['auto', 'auto']}
                  width={40}
                  tick={{ fontSize: 10 }}
                  orientation="right"
                  tickFormatter={(v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1))}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(_v, _n, p) => {
                    const b = p.payload as Bar_
                    return [`O ${b.o}  H ${b.h}  L ${b.l}  C ${b.c}`, b.date]
                  }}
                  labelFormatter={() => ''}
                />
                <Bar dataKey="wick" barSize={1} isAnimationActive={false}>
                  {candles.map((c, i) => (
                    <Cell key={i} fill={c.up ? UP : DOWN} />
                  ))}
                </Bar>
                <Bar dataKey="body" barSize={5} isAnimationActive={false}>
                  {candles.map((c, i) => (
                    <Cell key={i} fill={c.up ? UP : DOWN} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center text-xs text-gray-500">no price data</div>
          )}
        </div>
        {last && (
          <div className="text-xs text-gray-400 tabular-nums">
            last {last.c} · {last.date}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
