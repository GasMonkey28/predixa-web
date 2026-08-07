import { tradingDayFromTimestamp } from '@/lib/dt-position-days'
import {
  fetchTradeStationCurrentOrders,
  fetchTradeStationHistoricalOrders,
  historicalOrdersSinceDate,
  type TradeStationOrder,
} from '@/lib/server/tradestation-client'

type OpenLot = {
  symbol: string
  isShort: boolean
  size: number
  entryDate: string
}

function queueKey(symbol: string, isShort: boolean): string {
  return `${symbol.toUpperCase()}:${isShort ? 'short' : 'long'}`
}

function orderTimestampMs(order: TradeStationOrder): number {
  const value = order.OpenedDateTime || order.ClosedDateTime
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function legFillQuantity(
  leg: NonNullable<TradeStationOrder['Legs']>[number],
  order: TradeStationOrder
): number {
  const executed = Number(leg.ExecQuantity)
  if (Number.isFinite(executed) && executed > 0) return Math.abs(Math.floor(executed))
  if (order.Status?.toUpperCase() === 'FLL') {
    const ordered = Number(leg.QuantityOrdered)
    if (Number.isFinite(ordered) && ordered !== 0) return Math.abs(Math.floor(ordered))
  }
  return 0
}

function normalizeSide(order: TradeStationOrder): string {
  return (order.Side || order.TradeAction || '').toLowerCase().replace(/[\s_-]/g, '')
}

function resolveFillIntent(
  order: TradeStationOrder,
  leg: NonNullable<TradeStationOrder['Legs']>[number],
  queues: Map<string, OpenLot[]>
): { kind: 'open' | 'close'; isShort: boolean } | null {
  const openOrClose = leg.OpenOrClose?.toLowerCase()
  const buyOrSell = (leg.BuyOrSell || '').toLowerCase()
  const side = normalizeSide(order)

  if (openOrClose === 'open') {
    return { kind: 'open', isShort: buyOrSell === 'sell' || side.includes('selltoopen') }
  }
  if (openOrClose === 'close') {
    return { kind: 'close', isShort: buyOrSell !== 'sell' }
  }

  if (
    side.includes('buytocover') ||
    side.includes('buytoclose') ||
    side.includes('selltoclose')
  ) {
    return {
      kind: 'close',
      isShort: side.includes('buytocover') || side.includes('buytoclose'),
    }
  }
  if (side.includes('sellshort') || side.includes('selltoopen')) {
    return { kind: 'open', isShort: true }
  }
  if (side.includes('buytoopen') || side === 'buy') {
    return { kind: 'open', isShort: false }
  }
  if (side === 'sell') {
    const longQ = queues.get(queueKey(leg.Symbol, false)) ?? []
    if (longQ.length > 0) return { kind: 'close', isShort: false }
    return { kind: 'open', isShort: true }
  }

  if (buyOrSell === 'buy') {
    const shortQ = queues.get(queueKey(leg.Symbol, true)) ?? []
    if (shortQ.length > 0) return { kind: 'close', isShort: true }
    return { kind: 'open', isShort: false }
  }
  if (buyOrSell === 'sell') {
    const longQ = queues.get(queueKey(leg.Symbol, false)) ?? []
    if (longQ.length > 0) return { kind: 'close', isShort: false }
    return { kind: 'open', isShort: true }
  }

  return null
}

/**
 * FIFO remaining open lots from fills → earliest entry trading day per symbol/side.
 * Prefer this over Position.Timestamp (often a snapshot time).
 */
export function entryDatesFromOrders(orders: TradeStationOrder[]): Map<string, string> {
  const sorted = [...orders].sort((a, b) => orderTimestampMs(a) - orderTimestampMs(b))
  const queues = new Map<string, OpenLot[]>()

  for (const order of sorted) {
    const entryDate = tradingDayFromTimestamp(order.OpenedDateTime || order.ClosedDateTime)

    for (const leg of order.Legs ?? []) {
      const symbol = leg.Symbol
      if (!symbol) continue

      const qty = legFillQuantity(leg, order)
      if (qty <= 0) continue

      const intent = resolveFillIntent(order, leg, queues)
      if (!intent) continue

      if (intent.kind === 'open') {
        const key = queueKey(symbol, intent.isShort)
        const queue = queues.get(key) ?? []
        queue.push({ symbol, isShort: intent.isShort, size: qty, entryDate })
        queues.set(key, queue)
        continue
      }

      const key = queueKey(symbol, intent.isShort)
      const queue = queues.get(key) ?? []
      let remaining = qty
      while (remaining > 0 && queue.length > 0) {
        const open = queue[0]!
        const take = Math.min(open.size, remaining)
        open.size -= take
        remaining -= take
        if (open.size <= 0) queue.shift()
      }
      queues.set(key, queue)
    }
  }

  const earliest = new Map<string, string>()
  for (const [key, queue] of queues) {
    if (queue.length === 0) continue
    let day = queue[0]!.entryDate
    for (const lot of queue) {
      if (lot.entryDate < day) day = lot.entryDate
    }
    earliest.set(key, day)
  }
  return earliest
}

export function positionEntryKey(symbol: string, longShort: string): string {
  const isShort = !longShort.toLowerCase().startsWith('long')
  return queueKey(symbol, isShort)
}

/** Load recent fills and resolve entry trading days for open lots. */
export async function loadOpenLotEntryDates(
  accessToken: string,
  accountId: string,
  daysBack = 21
): Promise<Map<string, string>> {
  const since = historicalOrdersSinceDate(daysBack)
  const [historical, current] = await Promise.all([
    fetchTradeStationHistoricalOrders(accessToken, [accountId], since, 'sim'),
    fetchTradeStationCurrentOrders(accessToken, [accountId], 'sim'),
  ])
  return entryDatesFromOrders([...historical, ...current])
}
