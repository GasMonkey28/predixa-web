'use client'

import { useState, memo, useMemo } from 'react'
import BriefingControls from './BriefingControls'
import type { PredixaBriefing, BriefingMode, Sentiment } from './types'

interface BriefingSectionProps {
  initialBriefing: PredixaBriefing | null
  initialMode?: BriefingMode
  articlesCount: number
}

const getSentimentColor = (sentiment: Sentiment): string => {
  switch (sentiment) {
    case 'bullish':
      return 'bg-green-500/20 text-green-400 border-green-500/50'
    case 'bearish':
      return 'bg-red-500/20 text-red-400 border-red-500/50'
    case 'mixed':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    case 'neutral':
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
  }
}

function BriefingSection({
  initialBriefing,
  initialMode = 'pro',
  articlesCount,
}: BriefingSectionProps) {
  const [briefing, setBriefing] = useState<PredixaBriefing | null>(
    initialBriefing
  )
  const [mode, setMode] = useState<BriefingMode>(initialMode)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleModeChange = (newMode: BriefingMode) => {
    setMode(newMode)
    // When mode changes, refresh briefing with new mode
    handleRefresh(newMode)
  }

  const handleRefresh = async (refreshMode?: BriefingMode, force = false) => {
    const targetMode = refreshMode || mode
    setIsRefreshing(true)
    setError(null)

    try {
      // Add force parameter to bypass cache if needed
      const url = `/api/news/briefing?mode=${targetMode}&t=${Date.now()}${force ? '&force=true' : ''}`
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to refresh briefing')
      }

      setBriefing(result.briefing)
      if (refreshMode) {
        setMode(refreshMode)
      }
    } catch (err) {
      console.error('Error refreshing briefing:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to refresh briefing'
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!briefing && !error) {
    return null
  }

  if (error && !briefing) {
    return (
      <div className="mb-8 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-yellow-400">
        <p className="font-semibold">Briefing temporarily unavailable</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!briefing) {
    return null
  }

  return (
    <div className="mb-8 rounded-2xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          Predixa Briefing for SPY
        </h2>
      </div>

      {/* Controls */}
      <BriefingControls
        currentMode={mode}
        onModeChange={handleModeChange}
      />

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-400">
          {error}
        </div>
      )}

      {/* Daily Brief Bullets */}
      <div className="mb-6 space-y-2">
        {briefing.daily_brief.map((bullet, index) => (
          <div
            key={index}
            className="flex items-start gap-3 text-gray-300"
          >
            <span className="mt-1 text-blue-400">•</span>
            <p>{bullet}</p>
          </div>
        ))}
      </div>

      {/* Themes and Sentiment */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Themes */}
        {briefing.themes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {briefing.themes.map((theme, index) => (
              <span
                key={index}
                className="rounded-full border border-zinc-700/50 bg-zinc-800/50 px-3 py-1 text-xs text-gray-300"
              >
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Sentiment Badge */}
        <div
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${getSentimentColor(briefing.sentiment)}`}
        >
          {briefing.sentiment}
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(BriefingSection)

