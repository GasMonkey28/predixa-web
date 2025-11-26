'use client'

import { useState } from 'react'
import type { BriefingMode } from './types'

interface BriefingControlsProps {
  currentMode: BriefingMode
  onModeChange: (mode: BriefingMode) => void
}

export default function BriefingControls({
  currentMode,
  onModeChange,
}: BriefingControlsProps) {
  const modes: { value: BriefingMode; label: string }[] = [
    { value: 'pro', label: 'Pro' },
    { value: 'simple', label: 'Simple' },
    { value: 'wsb', label: 'WSB' },
  ]

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
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
    </div>
  )
}

