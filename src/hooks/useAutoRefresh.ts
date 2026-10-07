'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { startAutoRefresh, type LocalRefreshWindow } from '@/lib/local-refresh-window'

export const DEFAULT_AUTO_REFRESH_MS = 30_000

type RefreshFn = () => void | Promise<void>

/**
 * Interval + tab-visibility refresh. Skips ticks while the document is hidden
 * and fires once when the tab becomes visible again.
 */
export function useAutoRefresh(
  refresh: RefreshFn,
  options?: {
    /** When false, timers are idle (e.g. TradeStation not connected). */
    enabled?: boolean
    intervalMs?: number
    defaultOn?: boolean
    /** Optional daily window in the user's device-local time. Initial loading is unaffected. */
    localTimeWindow?: LocalRefreshWindow
  }
) {
  const enabled = options?.enabled !== false
  const intervalMs = options?.intervalMs ?? DEFAULT_AUTO_REFRESH_MS
  const startHour = options?.localTimeWindow?.startHour
  const endHour = options?.localTimeWindow?.endHour
  const [autoRefresh, setAutoRefresh] = useState(options?.defaultOn !== false)
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  const run = useCallback(() => {
    void refreshRef.current()
  }, [])

  useEffect(() => {
    if (!autoRefresh || !enabled) return

    return startAutoRefresh(
      run,
      intervalMs,
      startHour != null && endHour != null ? { startHour, endHour } : undefined
    )
  }, [autoRefresh, enabled, intervalMs, run, startHour, endHour])

  return { autoRefresh, setAutoRefresh, intervalMs }
}
