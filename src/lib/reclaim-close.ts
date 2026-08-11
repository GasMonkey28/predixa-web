/** Shared live long reclaim-at-close filter (board page + Stock DT). */

export type ReclaimCloseWinRateSide = {
  win_rate_pct?: number
  n?: number
}

export type ReclaimCloseWinRates = {
  tickers?: Record<string, { long?: ReclaimCloseWinRateSide; short?: ReclaimCloseWinRateSide }>
}

export type ReclaimCloseFeederRow = {
  ticker?: string
  as_of_date?: string
  price_as_of?: string
  fallback?: boolean
  last?: number
  open?: number
  low?: number
  net_change_pct?: number
  range?: {
    prev_close?: number
    pred_high?: number
    pred_low?: number
    long_flat_price?: number
    min_overshoot?: number
    os_pct?: number
  }
  context?: {
    long_tier?: string
    y2y3_hands?: number
  }
}

export type LiveLongCloseRow = {
  rank: number
  ticker: string
  as_of_date?: string
  price_as_of?: string
  last?: number
  low?: number
  open?: number
  net_change_pct?: number
  from_open?: number
  from_open_pct?: number
  pred_low: number
  flat_at: number
  min_overshoot: number
  overshoot: number
  overshoot_pct: number
  win_rate_pct?: number
  win_n?: number
  long_tier?: string
  y2y3_hands?: number
}

function toFinite(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function lookupReclaimWinRate(
  winRates: ReclaimCloseWinRates | null | undefined,
  ticker: string,
  side: 'long' | 'short'
): ReclaimCloseWinRateSide | undefined {
  const map = winRates?.tickers
  if (!map || !ticker) return undefined
  const direct = map[ticker]?.[side]
  if (direct) return direct
  const hit = Object.entries(map).find(([key]) => key.toUpperCase() === ticker.toUpperCase())
  return hit?.[1]?.[side]
}

/**
 * Live long reclaim-at-close: today's band breached on the live low,
 * and last still outside (below pred_low) so a close print can be the entry.
 */
export function buildLiveLongCloseRows(
  board: ReclaimCloseFeederRow[],
  winRates: ReclaimCloseWinRates | null,
  minWinPct: number
): LiveLongCloseRow[] {
  const rows: Omit<LiveLongCloseRow, 'rank'>[] = []
  for (const row of board) {
    if (!row.ticker || row.fallback) continue
    const predLow =
      toFinite(row.range?.long_flat_price) ?? toFinite(row.range?.pred_low)
    const prev = toFinite(row.range?.prev_close)
    const osPct = toFinite(row.range?.os_pct)
    const minOs =
      toFinite(row.range?.min_overshoot) ??
      (prev != null && osPct != null ? (osPct / 100) * prev : undefined)
    if (predLow == null || minOs == null) continue

    const last = toFinite(row.last)
    const low = toFinite(row.low) ?? last
    if (last == null || low == null) continue
    if (!(last < predLow)) continue
    const overshoot = predLow - low
    if (!(overshoot >= minOs)) continue

    const wr = lookupReclaimWinRate(winRates, row.ticker, 'long')
    const winPct = toFinite(wr?.win_rate_pct)
    if (winPct == null || winPct < minWinPct) continue

    const overshootPct =
      prev != null && prev > 0 ? (100.0 * overshoot) / prev : Number.NaN
    const open = toFinite(row.open)
    const fromOpen = open != null ? last - open : undefined
    const fromOpenPct =
      fromOpen != null && open != null && open > 0 ? (fromOpen / open) * 100 : undefined

    rows.push({
      ticker: row.ticker,
      as_of_date: row.as_of_date,
      price_as_of: row.price_as_of,
      last,
      low,
      open,
      net_change_pct: toFinite(row.net_change_pct),
      from_open: fromOpen,
      from_open_pct: fromOpenPct,
      pred_low: predLow,
      flat_at: predLow,
      min_overshoot: minOs,
      overshoot,
      overshoot_pct: overshootPct,
      win_rate_pct: winPct,
      win_n: wr?.n,
      long_tier: row.context?.long_tier,
      y2y3_hands: row.context?.y2y3_hands,
    })
  }

  rows.sort((a, b) => {
    const os = (b.overshoot_pct || 0) - (a.overshoot_pct || 0)
    if (os !== 0) return os
    const wr = (b.win_rate_pct || 0) - (a.win_rate_pct || 0)
    if (wr !== 0) return wr
    return a.ticker.localeCompare(b.ticker)
  })

  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}
