'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'

import { getDominantSignal, getTierConfig } from '@/lib/tier-display'

interface OpposingStrengthWarning {
  has_warning: boolean
  warning_message?: string
  compensation_potential_message?: string
}

interface TierDailyData {
  date: string
  long_tier: string
  short_tier: string
  summary: string
  suggestions: string[]
  confidence: string
  risk: string
  outlook: string
  compensation_explanation?: string
  opposing_strength_warning?: OpposingStrengthWarning | null
  prev_date?: string | null
  prev_long_tier?: string | null
  prev_short_tier?: string | null
}

function StrengthBars({
  strength,
  variant,
}: {
  strength: number
  variant: 'long' | 'short'
}) {
  const active =
    variant === 'long'
      ? 'bg-gradient-to-t from-emerald-500 to-green-500 shadow-emerald-500/50'
      : 'bg-gradient-to-t from-red-500 to-rose-500 shadow-red-500/50'
  const inactive = variant === 'long' ? 'bg-emerald-900/30' : 'bg-red-900/30'

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-5 rounded ${i < strength ? active : inactive}`}
        />
      ))}
    </div>
  )
}

function TierMiniCard({
  side,
  tier,
  prevTier,
}: {
  side: 'long' | 'short'
  tier: string
  prevTier?: string | null
}) {
  const config = getTierConfig(tier)
  const isLong = side === 'long'

  return (
    <div
      className={`relative rounded-xl border p-3 ${
        isLong
          ? 'border-emerald-500/30 bg-gradient-to-br from-zinc-900/90 to-zinc-950/80'
          : 'border-red-500/30 bg-gradient-to-br from-zinc-900/90 to-zinc-950/80'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isLong ? (
            <TrendingUp className="w-4 h-4 text-green-400 shrink-0" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <div>
            <span className="text-sm font-bold text-white block">
              {isLong ? 'LONG' : 'SHORT'}
            </span>
            <span
              className={`text-[10px] ${isLong ? 'text-green-300' : 'text-rose-300'}`}
            >
              {isLong ? 'Buy signal' : 'Sell signal'}
            </span>
          </div>
        </div>
        <div
          className={`shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.bg} shadow-lg`}
        >
          <span
            className={`text-lg font-black tracking-wide ${config.text || 'text-white'}`}
          >
            {tier}
          </span>
        </div>
      </div>
      <StrengthBars strength={config.strength} variant={side} />
      <p className={`text-[10px] mt-1.5 ${isLong ? 'text-green-200/80' : 'text-rose-200/80'}`}>
        {config.description}
      </p>
      {prevTier != null && (
        <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300">
          Prev: {prevTier || 'N/A'}
        </span>
      )}
    </div>
  )
}

export default function MarketInsightTierStance({ fallbackText }: { fallbackText?: string }) {
  const [data, setData] = useState<TierDailyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tiers/daily?t=${Date.now()}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load tiers')
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tiers')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-14 bg-zinc-700/50 rounded-lg" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-24 bg-zinc-700/50 rounded-lg" />
          <div className="h-24 bg-zinc-700/50 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <p className="text-sm text-zinc-400 leading-relaxed">
        {fallbackText || error || 'Tier data unavailable.'}
      </p>
    )
  }

  const longConfig = getTierConfig(data.long_tier)
  const shortConfig = getTierConfig(data.short_tier)
  const { signal: dominantSignal, levelDifference } = getDominantSignal(
    data.long_tier,
    data.short_tier
  )

  return (
    <div className="space-y-3">
      {/* Dominant signal — compact */}
      <div
        className={`rounded-xl p-3 border ${
          dominantSignal === 'LONG'
            ? 'bg-gradient-to-r from-emerald-900/40 to-emerald-900/20 border-emerald-500/30'
            : dominantSignal === 'SHORT'
              ? 'bg-gradient-to-r from-red-900/40 to-red-900/20 border-red-500/30'
              : 'bg-zinc-900/40 border-zinc-500/30'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {dominantSignal === 'LONG' ? (
              <ArrowUpRight className="w-5 h-5 text-green-400 shrink-0" />
            ) : dominantSignal === 'SHORT' ? (
              <ArrowDownRight className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-zinc-300 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400">Dominant signal</div>
              <div
                className={`text-base font-bold truncate ${
                  dominantSignal === 'LONG'
                    ? 'text-green-400'
                    : dominantSignal === 'SHORT'
                      ? 'text-rose-400'
                      : 'text-zinc-300'
                }`}
              >
                {dominantSignal} TREND
              </div>
              <div className="text-[11px] text-gray-400 leading-snug">
                {dominantSignal === 'NEUTRAL'
                  ? 'Long and short are balanced'
                  : dominantSignal === 'LONG'
                    ? `Long is ${levelDifference} level${levelDifference !== 1 ? 's' : ''} stronger`
                    : `Short is ${levelDifference} level${levelDifference !== 1 ? 's' : ''} stronger`}
              </div>
            </div>
          </div>
          <div
            className={`shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r ${
              dominantSignal === 'LONG'
                ? longConfig.bg
                : dominantSignal === 'SHORT'
                  ? shortConfig.bg
                  : 'from-zinc-700 via-gray-700 to-zinc-700'
            }`}
          >
            <span
              className={`text-sm font-bold ${
                dominantSignal === 'NEUTRAL'
                  ? longConfig.text || 'text-white'
                  : dominantSignal === 'LONG'
                    ? longConfig.text || 'text-white'
                    : shortConfig.text || 'text-white'
              }`}
            >
              {dominantSignal === 'NEUTRAL'
                ? `${data.long_tier} / ${data.short_tier}`
                : dominantSignal === 'LONG'
                  ? data.long_tier
                  : data.short_tier}
            </span>
          </div>
        </div>
      </div>

      {(data.compensation_explanation ||
        data.opposing_strength_warning?.has_warning) && (
        <div className="space-y-2">
          {data.compensation_explanation && (
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-900/25 p-2.5">
              <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
                <Info className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Market context
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 leading-relaxed">
                {data.compensation_explanation}
              </p>
            </div>
          )}
          {data.opposing_strength_warning?.has_warning && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-900/25 p-2.5">
              <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Opposing strength
                </span>
              </div>
              {data.opposing_strength_warning.warning_message && (
                <p className="text-[11px] text-amber-200 font-medium leading-relaxed">
                  {data.opposing_strength_warning.warning_message}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <TierMiniCard
          side="long"
          tier={data.long_tier}
          prevTier={data.prev_date ? data.prev_long_tier : undefined}
        />
        <TierMiniCard
          side="short"
          tier={data.short_tier}
          prevTier={data.prev_date ? data.prev_short_tier : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-2.5">
          <div className="flex items-center gap-1.5 text-yellow-400 mb-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase">Risk</span>
          </div>
          <p className="text-xs font-semibold text-yellow-200 leading-snug">{data.risk}</p>
        </div>
        <div className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 p-2.5 shadow-md">
          <div className="text-[10px] text-white/80 uppercase font-semibold mb-0.5">
            Confidence
          </div>
          <p className="text-sm font-bold text-white leading-snug">{data.confidence}</p>
        </div>
      </div>

      {(data.summary || data.outlook || (data.suggestions?.length ?? 0) > 0) && (
        <div className="rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-950/50 to-indigo-950/40 p-3">
          {data.summary && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-semibold text-white">Quick insight</span>
              </div>
              <p className="text-[11px] text-blue-200 leading-relaxed">{data.summary}</p>
            </div>
          )}
          {data.outlook && data.outlook !== 'No outlook available' && (
            <p className="text-[11px] text-indigo-200/90 mb-2">
              <span className="font-semibold text-indigo-300">Outlook: </span>
              {data.outlook}
            </p>
          )}
          {data.suggestions && data.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase">
                Recommendations
              </span>
              {data.suggestions.slice(0, 2).map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-md bg-blue-900/25 border border-blue-700/20"
                >
                  <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-blue-100 leading-snug">{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-zinc-500">Session date: {data.date}</p>
    </div>
  )
}
