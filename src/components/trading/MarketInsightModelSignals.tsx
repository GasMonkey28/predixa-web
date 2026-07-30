'use client'

import { useEffect, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Info,
} from 'lucide-react'

import Model2Chart from '@/components/trading/Model2Chart'
import SessionDateBadge from '@/components/trading/SessionDateBadge'
import type { Direction, MarketInsightFacts } from '@/lib/server/market-insight-types'

interface Model2Today {
  date: string
  final_signal: string
  position_size: number
  y1_signal: string
  y2y3_signal: string
  pred_y1: number
  pred_y2_plus_y3: number
}

interface Model2ApiData {
  today?: Model2Today
  trading_days?: Array<Record<string, unknown>>
  fallback?: boolean
}

const Y_KEYS = ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8'] as const

function signalBannerClass(signal: string): string {
  if (signal === 'long') {
    return 'bg-gradient-to-r from-emerald-900/40 to-emerald-900/20 border-emerald-500/30'
  }
  if (signal === 'short') {
    return 'bg-gradient-to-r from-red-900/40 to-red-900/20 border-red-500/30'
  }
  return 'bg-zinc-900/40 border-zinc-500/30'
}

function signalTextClass(signal: string): string {
  if (signal === 'long') return 'text-green-400'
  if (signal === 'short') return 'text-rose-400'
  return 'text-zinc-300'
}

function signalBadgeClass(signal: string): string {
  if (signal === 'long') return 'bg-gradient-to-r from-emerald-600 to-green-500'
  if (signal === 'short') return 'bg-gradient-to-r from-red-600 to-rose-500'
  return 'bg-gradient-to-r from-zinc-700 to-gray-600'
}

function directionPillClass(dir: Direction): string {
  if (dir === 'up') return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
  if (dir === 'down') return 'bg-red-500/20 border-red-500/40 text-red-300'
  return 'bg-zinc-700/50 border-zinc-600/40 text-zinc-400'
}

function formatPred(val: number): string {
  return val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)
}

function extractToday(data: Model2ApiData): Model2Today | null {
  if (data.today?.final_signal) return data.today
  const days = data.trading_days
  if (!days?.length) return null
  const last = days[days.length - 1]
  if (!last.as_of_date) return null
  return {
    date: String(last.as_of_date),
    final_signal: String(last.final_signal ?? 'no_trade'),
    position_size: Number(last.position_size ?? 0),
    y1_signal: String(last.y1_signal ?? 'no_trade'),
    y2y3_signal: String(last.y2y3_signal ?? 'no_trade'),
    pred_y1: Number(last.pred_y1 ?? 0),
    pred_y2_plus_y3: Number(last.pred_y2_plus_y3 ?? 0),
  }
}

function SignalMiniCard({
  title,
  subtitle,
  signal,
  predLabel,
  predValue,
  accent,
}: {
  title: string
  subtitle: string
  signal: string
  predLabel: string
  predValue: number
  accent: 'blue' | 'purple'
}) {
  const border = accent === 'blue' ? 'border-blue-500/30' : 'border-purple-500/30'
  const icon = accent === 'blue' ? 'text-blue-400' : 'text-purple-400'
  const sub = accent === 'blue' ? 'text-blue-300' : 'text-purple-300'

  return (
    <div className={`rounded-xl border ${border} bg-zinc-900/60 p-3`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className={`w-4 h-4 shrink-0 ${icon}`} />
          <div>
            <span className="text-sm font-bold text-white block">{title}</span>
            <span className={`text-[10px] ${sub}`}>{subtitle}</span>
          </div>
        </div>
        <span
          className={`shrink-0 px-2 py-1 rounded-lg text-xs font-black text-white ${signalBadgeClass(signal)}`}
        >
          {signal.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>
      <div className="flex items-center justify-between rounded-md bg-zinc-800/50 border border-zinc-700 px-2 py-1.5">
        <span className="text-[10px] text-zinc-400">{predLabel}</span>
        <span
          className={`text-xs font-bold font-mono ${predValue >= 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {formatPred(predValue)}
        </span>
      </div>
    </div>
  )
}

export default function MarketInsightModelSignals({
  facts,
  fallbackText,
  ticker = 'SPY',
  showModel1 = true,
}: {
  facts?: MarketInsightFacts | null
  fallbackText?: string
  ticker?: string
  /** SPY summary shows Model1 horizons; equity tickers page shows y2y3 only. */
  showModel1?: boolean
}) {
  const [model2, setModel2] = useState<Model2ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const qs = new URLSearchParams({ t: String(Date.now()), ticker })
        const res = await fetch(`/api/model2/daily?${qs}`)
        const json = (await res.json()) as Model2ApiData
        if (!res.ok) throw new Error('Failed to load Model 2 data')
        setModel2(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load model signals')
      } finally {
        setLoading(false)
      }
    }
    setLoading(true)
    setError(null)
    load()
  }, [ticker])

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-14 bg-zinc-700/50 rounded-lg" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-20 bg-zinc-700/50 rounded-lg" />
          <div className="h-20 bg-zinc-700/50 rounded-lg" />
        </div>
        <div className="h-36 bg-zinc-700/50 rounded-lg" />
      </div>
    )
  }

  const today = model2 ? extractToday(model2) : null
  const hasModel1 = showModel1 && facts?.model1 != null
  const hasModel2 = today != null

  if (!hasModel1 && !hasModel2) {
    return (
      <p className="text-sm text-zinc-400 leading-relaxed">
        {fallbackText || error || 'Model signals unavailable.'}
      </p>
    )
  }

  const finalSignal = today?.final_signal ?? 'no_trade'

  return (
    <div className="space-y-3">
      {hasModel2 && today && <SessionDateBadge date={today.date} />}

      {hasModel1 && facts?.model1 && (
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-cyan-300">Model 1 horizons</span>
            <span className="text-[10px] font-medium uppercase text-zinc-400">
              Net: {facts.model1.net_bias}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Y_KEYS.map((key) => (
              <span
                key={key}
                className={`px-1.5 py-0.5 rounded border text-[10px] font-medium uppercase ${directionPillClass(facts.model1!.y_directions[key] ?? 'flat')}`}
              >
                {key}: {facts.model1!.y_directions[key] ?? 'flat'}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">
            {facts.model1.bullish_count} up · {facts.model1.bearish_count} down ·{' '}
            {facts.model1.flat_count} flat
          </p>
        </div>
      )}

      {hasModel2 && today && (
        <>
          <div className={`rounded-xl p-3 border ${signalBannerClass(finalSignal)}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {finalSignal === 'long' ? (
                  <ArrowUpRight className="w-5 h-5 text-green-400 shrink-0" />
                ) : finalSignal === 'short' ? (
                  <ArrowDownRight className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <Info className="w-5 h-5 text-zinc-300 shrink-0" />
                )}
                <div>
                  <div className="text-[10px] text-gray-400">Model 2 final signal</div>
                  <div className={`text-base font-bold ${signalTextClass(finalSignal)}`}>
                    {finalSignal.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Size {today.position_size > 0 ? `+${today.position_size}` : today.position_size}
                  </div>
                </div>
              </div>
              <span
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold text-white ${signalBadgeClass(finalSignal)}`}
              >
                {today.position_size > 0 ? `+${today.position_size}` : today.position_size}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SignalMiniCard
              title="Y2+Y3"
              subtitle="Combined"
              signal={today.y2y3_signal}
              predLabel="Pred Y2+Y3"
              predValue={today.pred_y2_plus_y3}
              accent="purple"
            />
            <SignalMiniCard
              title="Y1"
              subtitle="Prediction"
              signal={today.y1_signal}
              predLabel="Pred Y1"
              predValue={today.pred_y1}
              accent="blue"
            />
          </div>

          {model2?.trading_days && model2.trading_days.length > 0 && (
            <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/40 p-2">
              <p className="text-[10px] text-zinc-500 mb-2 px-1">Model 2 price action (recent)</p>
              <Model2Chart
                tradingDays={model2.trading_days as never[]}
                height={400}
                chartType="candlestick"
                embedded
                showPnlToggle={false}
                maxDays={20}
              />
            </div>
          )}
        </>
      )}

      {!hasModel2 && hasModel1 && (
        <p className="text-[11px] text-zinc-500">{fallbackText}</p>
      )}
    </div>
  )
}
