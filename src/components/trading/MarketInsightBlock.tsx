'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, BarChart3, Calendar, Layers } from 'lucide-react'

import type { MarketInsightResponse } from '@/lib/server/market-insight-types'
import MarketInsightTierStance from '@/components/trading/MarketInsightTierStance'

const sectionIcons: Record<string, typeof BarChart3> = {
  tiers: Layers,
  models: BarChart3,
  weekly: Calendar,
  agreement: AlertTriangle,
}

export default function MarketInsightBlock() {
  const [data, setData] = useState<MarketInsightResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/market-insight/daily?t=${Date.now()}`)
        const json = (await res.json()) as MarketInsightResponse & { error?: string }
        if (!res.ok) throw new Error(json.error || 'Failed to load market insight')
        setData(json)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load market insight')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-zinc-700/50 rounded w-1/3" />
        <div className="h-20 bg-zinc-700/50 rounded" />
        <div className="h-20 bg-zinc-700/50 rounded" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <p className="text-red-400 text-sm">{error || 'Market insight unavailable.'}</p>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Market insight</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Rule-based summary for {data.date} — built from tiers, models, and weekly data (no AI rewrite in v1).
        </p>
      </div>

      {data.fallback && (
        <p className="text-amber-400/90 text-sm">
          Some data sources are missing; sections below may be incomplete.
        </p>
      )}

      <div className="space-y-4">
        {data.sections.map((section, i) => {
          const Icon = sectionIcons[section.id] ?? BarChart3
          return (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-zinc-700/60 bg-zinc-900/50 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-blue-400 shrink-0" />
                <h3 className="text-sm font-medium text-zinc-200">{section.title}</h3>
              </div>
              {section.id === 'tiers' ? (
                <MarketInsightTierStance fallbackText={section.body} />
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed">{section.body}</p>
              )}
            </motion.section>
          )
        })}
      </div>

      <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-4 leading-relaxed">
        {data.disclaimer}
      </p>
    </div>
  )
}
