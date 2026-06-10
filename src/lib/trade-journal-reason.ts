export interface TradeJournalSignalSnapshot {
  date: string
  model1: {
    long_tier: string
    short_tier: string
  }
  model2: {
    position_size: number | null
    pred_y1: number | null
    pred_y2_plus_y3: number | null
  }
  reason: string
}

function formatPred(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2)
}

export function formatTradeJournalReason(snapshot: {
  model1: { long_tier: string; short_tier: string }
  model2: {
    position_size: number | null
    pred_y1: number | null
    pred_y2_plus_y3: number | null
  }
}): string {
  const size =
    snapshot.model2.position_size == null ? '—' : String(snapshot.model2.position_size)
  return [
    `M1 L:${snapshot.model1.long_tier} S:${snapshot.model1.short_tier}`,
    `size ${size}`,
    `M2 y1 ${formatPred(snapshot.model2.pred_y1)} y2+y3 ${formatPred(snapshot.model2.pred_y2_plus_y3)}`,
  ].join(' | ')
}

export async function fetchTradeJournalSignals(
  entryDate: string
): Promise<TradeJournalSignalSnapshot | null> {
  if (!entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return null

  try {
    const response = await fetch(
      `/api/trade-journal/signals?date=${encodeURIComponent(entryDate)}`,
      { cache: 'no-store' }
    )
    if (!response.ok) return null
    return (await response.json()) as TradeJournalSignalSnapshot
  } catch {
    return null
  }
}

export async function fetchTradeJournalReason(entryDate: string): Promise<string> {
  const snapshot = await fetchTradeJournalSignals(entryDate)
  return snapshot?.reason ?? ''
}
