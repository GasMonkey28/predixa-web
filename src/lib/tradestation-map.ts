import { InstrumentType, OpenPositionSummary, TradeJournalEntry } from '@/lib/trade-journal-types'
import type {
  TradeStationOrder,
  TradeStationPosition,
} from '@/lib/server/tradestation-client'

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

export interface TradeStationPositionLine {
  symbol: string
  instrumentType: InstrumentType
  quantity: number
  longShort: 'Long' | 'Short'
  signedQuantity: number
}

export function isJournalComparableSymbol(symbol: string): boolean {
  const root = getFuturesRoot(symbol)
  return root.startsWith('MES') || root.startsWith('ES')
}

/** Net long/short contract counts from TradeStation open positions (MES + ES). */
export function calcTradeStationPositionSummary(
  positions: Pick<TradeStationPosition, 'Symbol' | 'Quantity' | 'LongShort'>[]
): OpenPositionSummary & { lines: TradeStationPositionLine[] } {
  const lines: TradeStationPositionLine[] = []
  let longContracts = 0
  let shortContracts = 0

  for (const position of positions) {
    if (!isJournalComparableSymbol(position.Symbol)) continue

    const quantity = parseQuantity(position.Quantity)
    const isShort = position.LongShort?.toLowerCase() === 'short'
    const signedQuantity = isShort ? -quantity : quantity

    lines.push({
      symbol: position.Symbol,
      instrumentType: mapSymbolToInstrument(position.Symbol),
      quantity,
      longShort: isShort ? 'Short' : 'Long',
      signedQuantity,
    })

    if (isShort) shortContracts += quantity
    else longContracts += quantity
  }

  lines.sort((a, b) => a.symbol.localeCompare(b.symbol))

  return {
    highestLong: longContracts,
    highestShort: shortContracts > 0 ? -shortContracts : 0,
    netPosition: longContracts - shortContracts,
    lines,
  }
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

type OpenLot = {
  symbol: string
  isShort: boolean
  price: number
  size: number
  entryDate: string
  orderId: string
}

function queueKey(symbol: string, isShort: boolean): string {
  return `${symbol}:${isShort ? 'short' : 'long'}`
}

function orderTimestamp(order: TradeStationOrder): number {
  const value = order.OpenedDateTime || order.ClosedDateTime
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function legFillPrice(
  leg: NonNullable<TradeStationOrder['Legs']>[number],
  order: TradeStationOrder
): number | null {
  return (
    parsePrice(leg.ExecutionPrice) ??
    parsePrice(order.FilledPrice) ??
    parsePrice(order.PriceUsedForBuyingPower)
  )
}

function legFillQuantity(
  leg: NonNullable<TradeStationOrder['Legs']>[number],
  order: TradeStationOrder
): number {
  const executed = Number(leg.ExecQuantity)
  if (Number.isFinite(executed) && executed > 0) return Math.abs(Math.floor(executed))
  if (order.Status?.toUpperCase() === 'FLL') {
    return parseQuantity(leg.QuantityOrdered)
  }
  return 0
}

/** Pair open/close fills (FIFO) into closed journal rows. */
export function mapHistoricalOrdersToJournalEntries(
  orders: TradeStationOrder[]
): Partial<TradeJournalEntry>[] {
  const sorted = [...orders].sort((a, b) => orderTimestamp(a) - orderTimestamp(b))
  const queues = new Map<string, OpenLot[]>()
  const entries: Partial<TradeJournalEntry>[] = []

  for (const order of sorted) {
    const entryDate = toEntryDate(order.OpenedDateTime)

    for (const leg of order.Legs ?? []) {
      const symbol = leg.Symbol
      if (!symbol) continue

      const qty = legFillQuantity(leg, order)
      if (qty <= 0) continue

      const price = legFillPrice(leg, order)
      if (price == null) continue

      const openOrClose = leg.OpenOrClose?.toLowerCase()
      const buyOrSell = leg.BuyOrSell?.toLowerCase()

      if (openOrClose === 'open') {
        const isShort = buyOrSell === 'sell'
        const key = queueKey(symbol, isShort)
        const queue = queues.get(key) ?? []
        queue.push({
          symbol,
          isShort,
          price: Math.abs(price),
          size: qty,
          entryDate,
          orderId: order.OrderID,
        })
        queues.set(key, queue)
        continue
      }

      if (openOrClose === 'close') {
        const closesLong = buyOrSell === 'sell'
        const isShort = !closesLong
        const key = queueKey(symbol, isShort)
        const queue = queues.get(key) ?? []
        if (queue.length === 0) continue

        const open = queue.shift()!
        const size = Math.min(open.size, qty)
        const buyPrice = open.isShort ? -open.price : open.price

        entries.push({
          entryDate: open.entryDate,
          closeDate: toEntryDate(order.ClosedDateTime || order.OpenedDateTime),
          profitMonth: null,
          instrumentType: mapSymbolToInstrument(symbol),
          positionSize: size,
          buyPrice,
          soldPrice: Math.abs(price),
          targetPrice: null,
          reason: `TradeStation ${symbol}`,
          rating: '',
          source: 'tradestation',
          externalId: `ts-trade-${open.orderId}-${order.OrderID}`,
        })

        if (open.size > size) {
          queue.unshift({ ...open, size: open.size - size })
        }
        queues.set(key, queue)
      }
    }
  }

  return entries.sort((a, b) => (b.entryDate ?? '').localeCompare(a.entryDate ?? ''))
}

export function mergeTradeStationEntries(
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
          entryDate: existing.entryDate || patch.entryDate || existing.entryDate,
          closeDate: existing.closeDate ?? patch.closeDate ?? null,
          instrumentType: patch.instrumentType ?? existing.instrumentType,
          positionSize: patch.positionSize ?? existing.positionSize,
          buyPrice: patch.buyPrice ?? existing.buyPrice,
          soldPrice: patch.soldPrice ?? existing.soldPrice ?? null,
          reason: existing.reason || patch.reason || '',
          closeReason: existing.closeReason ?? patch.closeReason ?? null,
          pointsContributed: existing.pointsContributed ?? patch.pointsContributed ?? null,
          contributedToEntryId:
            existing.contributedToEntryId ?? patch.contributedToEntryId ?? null,
          rating: existing.rating,
          profitMonth: existing.profitMonth,
          source: 'tradestation',
          externalId: patch.externalId,
        }
      }
      continue
    }

    const created: TradeJournalEntry = {
      id: crypto.randomUUID(),
      entryDate: patch.entryDate ?? new Date().toISOString().slice(0, 10),
      closeDate: patch.closeDate ?? null,
      profitMonth: patch.profitMonth ?? null,
      no: 0,
      instrumentType: patch.instrumentType ?? 'mini_future',
      positionSize: patch.positionSize ?? 1,
      buyPrice: patch.buyPrice ?? null,
      soldPrice: patch.soldPrice ?? null,
      targetPrice: patch.targetPrice ?? null,
      profit: null,
      reason: patch.reason ?? '',
      closeReason: patch.closeReason ?? null,
      pointsContributed: patch.pointsContributed ?? null,
      contributedToEntryId: patch.contributedToEntryId ?? null,
      rating: patch.rating ?? '',
      source: 'tradestation',
      externalId: patch.externalId,
    }
    next.unshift(created)
    byExternalId.set(patch.externalId, created)
  }

  return next
}

/** @deprecated Use mergeTradeStationEntries */
export function mergeSyncedPositions(
  entries: TradeJournalEntry[],
  synced: Partial<TradeJournalEntry>[]
): TradeJournalEntry[] {
  return mergeTradeStationEntries(entries, synced)
}
