'use client'

import { DEFAULT_AUTO_REFRESH_MS } from '@/hooks/useAutoRefresh'

type AutoRefreshControlsProps = {
  autoRefresh: boolean
  onAutoRefreshChange: (on: boolean) => void
  intervalMs?: number
  onRefresh?: () => void
  refreshing?: boolean
  refreshLabel?: string
  className?: string
}

export default function AutoRefreshControls({
  autoRefresh,
  onAutoRefreshChange,
  intervalMs = DEFAULT_AUTO_REFRESH_MS,
  onRefresh,
  refreshing = false,
  refreshLabel = 'Refresh',
  className = '',
}: AutoRefreshControlsProps) {
  const secs = Math.round(intervalMs / 1000)

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(e) => onAutoRefreshChange(e.target.checked)}
          className="rounded border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500/40"
        />
        Auto-refresh ({secs}s)
      </label>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-medium"
        >
          {refreshing ? 'Refreshing…' : refreshLabel}
        </button>
      )}
    </div>
  )
}
