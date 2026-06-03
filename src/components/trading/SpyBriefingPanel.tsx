'use client'

import { useEffect, useState } from 'react'
import BriefingSection from '@/app/news/spy/BriefingSection'
import type { PredixaBriefing } from '@/app/news/spy/types'

function BriefingSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-6 backdrop-blur-sm">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-zinc-800" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-800" />
        ))}
      </div>
    </div>
  )
}

export default function SpyBriefingPanel() {
  const [briefing, setBriefing] = useState<PredixaBriefing | null>(null)
  const [articlesCount, setArticlesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/news/briefing?mode=pro&t=${Date.now()}`)
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to load briefing')
        }
        setBriefing(result.briefing ?? null)
        setArticlesCount(result.articlesCount ?? 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load briefing')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <BriefingSkeleton />
  }

  if (error && !briefing) {
    return (
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-yellow-400">
        <p className="font-semibold">Briefing temporarily unavailable</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!briefing) {
    return (
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4 text-gray-400 text-sm">
        Predixa Briefing is not available yet. Check back shortly or visit{' '}
        <a href="/news/spy" className="text-blue-400 hover:text-blue-300">
          SPY News
        </a>
        .
      </div>
    )
  }

  return (
    <BriefingSection
      initialBriefing={briefing}
      initialMode="pro"
      articlesCount={articlesCount}
    />
  )
}
