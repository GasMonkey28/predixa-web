import { InstrumentType, TradeJournalEntry } from '@/lib/trade-journal-types'
import type { TradeStationPosition } from '@/lib/server/tradestation-client'

export function getFuturesRoot(symbol: string): string {
  const normalized = symbol.replace(/^@/, '').toUpperCase()
  const match = normalized.match(/^([A-Z]+)/)
  return match?.[1] ?? normalized
}

export function mapSymbolToInstrument(symbol: string): InstrumentType {
  const root = getFuturesRoot(symbol)
  if (root.startsWith('MES')) return 'mini_future'
  if (root.startsWith('ES')) return 'future'
  return 'stock'
}

function parsePrice(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseQuantity(value: string | undefined): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed === 0) return 1
  return Math.abs(Math.floor(parsed))
}

function toEntryDate(timestamp?: string): string {
  if (!timestamp) return new Date().toISOString().slice(0, 10)
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

export function mapPositionToJournalEntry(position: TradeStationPosition): Partial<TradeJournalEntry> {
  const avgPrice = parsePrice(position.AveragePrice)
  const isShort = position.LongShort?.toLowerCase() === 'short'
  const signedBuy = avgPrice == null ? null : isShort ? -Math.abs(avgPrice) : Math.abs(avgPrice)

  return {
    entryDate: toEntryDate(position.Timestamp),
    profitMonth: null,
    instrumentType: mapSymbolToInstrument(position.Symbol),
    positionSize: parseQuantity(position.Quantity),
    buyPrice: signedBuy,
    soldPrice: null,
    targetPrice: null,
    reason: `TradeStation ${position.Symbol}`,
    rating: '',
    source: 'tradestation',
    externalId: `ts-pos-${position.PositionID}`,
  }
}

export function mergeSyncedPositions(
  entries: TradeJournalEntry[],
  synced: Partial<TradeJournalEntry>[]
): TradeJournalEntry[] {
  const byExternalId = new Map(
    entries
      .filter((entry) => entry.externalId)
      .map((entry) => [entry.externalId as string, entry])
  )

  const next = [...entries]

  for (const patch of synced) {
    if (!patch.externalId) continue
    const existing = byExternalId.get(patch.externalId)
    if (existing) {
      const index = next.findIndex((entry) => entry.id === existing.id)
      if (index >= 0) {
        next[index] = {
          ...existing,
          entryDate: patch.entryDate ?? existing.entryDate,
          instrumentType: patch.instrumentType ?? existing.instrumentType,
          positionSize: patch.positionSize ?? existing.positionSize,
          buyPrice: patch.buyPrice ?? existing.buyPrice,
          soldPrice: existing.soldPrice ?? null,
          reason: existing.reason || patch.reason || '',
          source: 'tradestation',
          externalId: patch.externalId,
        }
      }
      continue
    }

    next.push({
      id: crypto.randomUUID(),
      entryDate: patch.entryDate ?? new Date().toISOString().slice(0, 10),
      profitMonth: null,
      no: 0,
      instrumentType: patch.instrumentType ?? 'mini_future',
      positionSize: patch.positionSize ?? 1,
      buyPrice: patch.buyPrice ?? null,
      soldPrice: null,
      targetPrice: null,
      profit: null,
      reason: patch.reason ?? '',
      rating: '',
      source: 'tradestation',
      externalId: patch.externalId,
    })
  }

  return next
}
