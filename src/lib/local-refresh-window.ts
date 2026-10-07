export interface LocalRefreshWindow {
  /** Hours on the user's device clock; start inclusive, end exclusive. */
  startHour: number
  endHour: number
}

export const SUMMARY_REFRESH_WINDOW: LocalRefreshWindow = { startHour: 8, endHour: 9 }

export function isInLocalRefreshWindow(now: Date, window: LocalRefreshWindow): boolean {
  const hour = now.getHours()
  return hour >= window.startHour && hour < window.endHour
}

/** Recheck time on every tick so a page left open starts and stops automatically. */
export function startAutoRefresh(
  refresh: () => void | Promise<void>,
  intervalMs: number,
  localTimeWindow?: LocalRefreshWindow
): () => void {
  const tick = () => {
    if (document.visibilityState !== 'visible') return
    if (localTimeWindow && !isInLocalRefreshWindow(new Date(), localTimeWindow)) return
    void refresh()
  }

  const id = window.setInterval(tick, intervalMs)
  document.addEventListener('visibilitychange', tick)
  return () => {
    window.clearInterval(id)
    document.removeEventListener('visibilitychange', tick)
  }
}
