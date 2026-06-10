import { InstrumentType } from '@/lib/trade-journal-types'
import type { TradeStationOrder } from '@/lib/server/tradestation-client'
import { mapSymbolToInstrument } from '@/lib/tradestation-map'

export interface TradeStationRecentFill {
  id: string
  orderId: string
  symbol: string
  instrumentType: InstrumentType
  label: string
  date: string
  time: string
  timestampMs: number
  quantity: number
  price: number
  openOrClose: 'open' | 'close'
  buyOrSell: 'buy' | 'sell'
  buyValue: number | null
  soldValue: number | null
}

const FILLED_STATUSES = new Set(['FLL', 'FPR', 'FLP', 'OUT', 'CLS'])

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

function orderTimestampMs(order: TradeStationOrder): number {
  const value = order.ClosedDateTime || order.OpenedDateTime
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function toEtDateTime(timestamp?: string): { date: string; time: string; timestampMs: number } {
  if (!timestamp) {
    const now = new Date()
    return {
      date: now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
      time: now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      timestampMs: now.getTime(),
    }
  }

  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return toEtDateTime(undefined)
  }

  return {
    date: parsed.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
    time: parsed.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    timestampMs: parsed.getTime(),
  }
}

function legQuantity(
  leg: NonNullable<TradeStationOrder['Legs']>[number],
  order: TradeStationOrder
): number {
  const executed = Number(leg.ExecQuantity)
  if (Number.isFinite(executed) && executed > 0) return Math.abs(Math.floor(executed))

  const status = order.Status?.toUpperCase() ?? ''
  if (FILLED_STATUSES.has(status)) {
    const remaining = Number(leg.QuantityRemaining)
    const ordered = parseQuantity(leg.QuantityOrdered)
    if (Number.isFinite(remaining) && ordered > remaining && ordered - remaining > 0) {
      return Math.floor(ordered - remaining)
    }
    return ordered
  }

  return 0
}

function legPrice(
  leg: NonNullable<TradeStationOrder['Legs']>[number],
  order: TradeStationOrder
): number | null {
  return (
    parsePrice(leg.ExecutionPrice) ??
    parsePrice(order.FilledPrice) ??
    parsePrice(order.PriceUsedForBuyingPower)
  )
}

function formatLabel(
  symbol: string,
  openOrClose: 'open' | 'close',
  buyOrSell: 'buy' | 'sell',
  price: number,
  qty: number
): string {
  const side = openOrClose === 'open' ? (buyOrSell === 'buy' ? 'Long open' : 'Short open') : 'Close'
  return `${symbol} ${side} ${price} ×${qty}`
}

export function extractRecentFillsFromOrders(
  orders: TradeStationOrder[],
  limit = 6
): TradeStationRecentFill[] {
  const fills: TradeStationRecentFill[] = []

  for (const order of orders) {
    const status = order.Status?.toUpperCase() ?? ''
    const hasExecution = (order.Legs ?? []).some((leg) => Number(leg.ExecQuantity) > 0)
    if (!hasExecution && !FILLED_STATUSES.has(status)) continue

    const ts = toEtDateTime(order.ClosedDateTime || order.OpenedDateTime)
    const orderTs = orderTimestampMs(order) || ts.timestampMs

    for (let legIndex = 0; legIndex < (order.Legs?.length ?? 0); legIndex++) {
      const leg = order.Legs![legIndex]
      const symbol = leg.Symbol
      if (!symbol) continue

      const qty = legQuantity(leg, order)
      if (qty <= 0) continue

      const price = legPrice(leg, order)
      if (price == null) continue

      const openOrClose = leg.OpenOrClose?.toLowerCase() === 'close' ? 'close' : 'open'
      const buyOrSell = leg.BuyOrSell?.toLowerCase() === 'sell' ? 'sell' : 'buy'
      const absPrice = Math.abs(price)

      let buyValue: number | null = null
      let soldValue: number | null = null

      if (openOrClose === 'open') {
        buyValue = buyOrSell === 'sell' ? -absPrice : absPrice
      } else {
        soldValue = absPrice
      }

      fills.push({
        id: `ts-fill-${order.OrderID}-${legIndex}`,
        orderId: order.OrderID,
        symbol,
        instrumentType: mapSymbolToInstrument(symbol),
        label: formatLabel(symbol, openOrClose, buyOrSell, absPrice, qty),
        date: ts.date,
        time: ts.time,
        timestampMs: orderTs,
        quantity: qty,
        price: absPrice,
        openOrClose,
        buyOrSell,
        buyValue,
        soldValue,
      })
    }
  }

  return fills.sort((a, b) => b.timestampMs - a.timestampMs).slice(0, limit)
}

export function getUsedTradeStationFillIds(
  entries: { tradestationBuyFillId?: string | null; tradestationSoldFillId?: string | null }[]
): Set<string> {
  const used = new Set<string>()
  for (const entry of entries) {
    if (entry.tradestationBuyFillId) used.add(entry.tradestationBuyFillId)
    if (entry.tradestationSoldFillId) used.add(entry.tradestationSoldFillId)
  }
  return used
}

export const TS_FILL_DRAG_TYPE = 'application/x-predixa-ts-fill'
