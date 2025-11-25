'use client'

import { useState } from 'react'
import type { BriefingMode } from './types'

interface BriefingControlsProps {
  currentMode: BriefingMode
  onModeChange: (mode: BriefingMode) => void
  onRefresh: (force?: boolean) => void
  isRefreshing?: boolean
}

export default function BriefingControls({
  currentMode,
  onModeChange,
  onRefresh,
  isRefreshing = false,
}: BriefingControlsProps) {
  const modes: { value: BriefingMode; label: string }[] = [
    { value: 'pro', label: 'Pro' },
    { value: 'simple', label: 'Simple' },
    { value: 'wsb', label: 'WSB' },
  ]

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-400">Mode:</span>
        <div className="flex rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1">
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onModeChange(mode.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentMode === mode.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-zinc-700/50'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onRefresh(false)}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isRefreshing
              ? 'bg-zinc-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-zinc-800/50 text-gray-300 hover:bg-zinc-700/50 hover:text-white border border-zinc-700/50'
          }`}
          title="Refresh briefing (uses cache if available)"
        >
          <span
            className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: isRefreshing ? 'rotate(360deg)' : 'none' }}
          >
            ↻
          </span>
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh briefing'}</span>
        </button>
        <button
          onClick={() => onRefresh(true)}
          disabled={isRefreshing}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            isRefreshing
              ? 'bg-zinc-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-zinc-800/30 text-gray-400 hover:bg-zinc-700/30 hover:text-gray-300 border border-zinc-700/30'
          }`}
          title="Force refresh (bypasses cache, generates new briefing)"
        >
          <span className="text-xs">⚡</span>
          <span className="hidden sm:inline">Force</span>
        </button>
      </div>
    </div>
  )
}

