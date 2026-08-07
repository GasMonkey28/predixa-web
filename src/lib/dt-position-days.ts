const ET = 'America/New_York'

/** US/Eastern calendar date (YYYY-MM-DD) for a TradeStation timestamp. */
export function tradingDayFromTimestamp(timestamp?: string | null): string {
  const nowEt = () => new Date().toLocaleDateString('en-CA', { timeZone: ET })
  if (!timestamp) return nowEt()
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return nowEt()
  return parsed.toLocaleDateString('en-CA', { timeZone: ET })
}

export function todayTradingDay(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ET })
}

/** Human label for a YYYY-MM-DD trading day, e.g. "Fri, Aug 7, 2026 · Today". */
export function formatTradingDayLabel(day: string, today = todayTradingDay()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return day
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0))
  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return day === today ? `${formatted} · Today` : formatted
}

export type PositionDayGroup<T> = {
  day: string
  label: string
  positions: T[]
}

/** Group positions by entry trading day, newest day first. */
export function groupPositionsByTradingDay<T extends { entryDate?: string | null }>(
  positions: T[]
): PositionDayGroup<T>[] {
  const today = todayTradingDay()
  const byDay = new Map<string, T[]>()

  for (const p of positions) {
    const day =
      p.entryDate && /^\d{4}-\d{2}-\d{2}$/.test(p.entryDate) ? p.entryDate : today
    const list = byDay.get(day)
    if (list) list.push(p)
    else byDay.set(day, [p])
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, rows]) => ({
      day,
      label: formatTradingDayLabel(day, today),
      positions: rows,
    }))
}
