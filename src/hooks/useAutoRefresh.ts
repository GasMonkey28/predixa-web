'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
  }
) {
  const enabled = options?.enabled !== false
  const intervalMs = options?.intervalMs ?? DEFAULT_AUTO_REFRESH_MS
  const [autoRefresh, setAutoRefresh] = useState(options?.defaultOn !== false)
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  const run = useCallback(() => {
    void refreshRef.current()
  }, [])

  useEffect(() => {
    if (!autoRefresh || !enabled) return

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      run()
    }

    const id = window.setInterval(tick, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [autoRefresh, enabled, intervalMs, run])

  return { autoRefresh, setAutoRefresh, intervalMs }
}
