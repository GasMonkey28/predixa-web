import {
  InstrumentType,
  TradeJournalEntry,
  calcProfit,
  getTradeNumber,
  isLongPosition,
  isOpenPosition,
  isShortPosition,
} from '@/lib/trade-journal-types'
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

export function createJournalEntryFromFill(fill: TradeStationRecentFill): TradeJournalEntry {
  const isOpen = fill.openOrClose === 'open'

  return {
    id: crypto.randomUUID(),
    entryDate: fill.date,
    profitMonth: null,
    no: 0,
    instrumentType: fill.instrumentType,
    positionSize: fill.quantity,
    buyPrice: isOpen ? fill.buyValue : null,
    soldPrice: isOpen ? null : fill.soldValue,
    targetPrice: null,
    profit: null,
    reason: `TradeStation ${fill.symbol}`,
    rating: '',
    source: 'tradestation',
    externalId: null,
    tradestationBuyFillId: isOpen ? fill.id : null,
    tradestationSoldFillId: isOpen ? null : fill.id,
  }
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

export type TsFillJournalAction = 'buy' | 'sell' | 'sold' | 'takeProfit'

export interface TsFillJournalTarget {
  entry: TradeJournalEntry
  tradeNo: number | null
  projectedProfit: number | null
}

function matchesFillInstrument(entry: TradeJournalEntry, fill: TradeStationRecentFill): boolean {
  return entry.instrumentType === fill.instrumentType
}

/** Journal rows eligible for Buy / Sell / Take profit from a recent fill. */
export function getJournalTargetsForFillAction(
  fill: TradeStationRecentFill,
  entries: TradeJournalEntry[],
  action: TsFillJournalAction
): TsFillJournalTarget[] {
  const exitPrice = fill.soldValue ?? fill.price

  if (action === 'buy') {
    if (fill.openOrClose !== 'open' || fill.buyOrSell !== 'buy') return []
    return entries
      .filter(
        (entry) =>
          matchesFillInstrument(entry, fill) &&
          (entry.buyPrice == null || entry.buyPrice === 0)
      )
      .map((entry) => ({
        entry,
        tradeNo: getTradeNumber(entries, entry.id),
        projectedProfit: null,
      }))
  }

  if (action === 'sell') {
    if (fill.openOrClose !== 'open' || fill.buyOrSell !== 'sell') return []
    return entries
      .filter(
        (entry) =>
          matchesFillInstrument(entry, fill) &&
          (entry.buyPrice == null || entry.buyPrice === 0)
      )
      .map((entry) => ({
        entry,
        tradeNo: getTradeNumber(entries, entry.id),
        projectedProfit: null,
      }))
  }

  if (action !== 'sold' && action !== 'takeProfit') return []
  if (fill.openOrClose !== 'close' || fill.soldValue == null) return []

  const closingShort = fill.buyOrSell === 'buy'
  const closingLong = fill.buyOrSell === 'sell'

  return entries
    .filter((entry) => {
      if (!isOpenPosition(entry) || !matchesFillInstrument(entry, fill)) return false
      if (closingShort) return isShortPosition(entry.buyPrice)
      if (closingLong) return isLongPosition(entry.buyPrice)
      return false
    })
    .map((entry) => ({
      entry,
      tradeNo: getTradeNumber(entries, entry.id),
      projectedProfit: calcProfit(
        entry.buyPrice,
        exitPrice,
        entry.instrumentType,
        entry.positionSize
      ),
    }))
}

const DISMISSED_FILLS_KEY = 'predixa-ts-dismissed-fills'

function dismissedStorageKey(userId?: string | null): string {
  return userId ? `${DISMISSED_FILLS_KEY}:${userId}` : DISMISSED_FILLS_KEY
}

export function loadDismissedTsFillIds(userId?: string | null): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(dismissedStorageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveDismissedTsFillIds(ids: Set<string>, userId?: string | null): void {
  if (typeof window === 'undefined') return
  const list = [...ids].slice(-200)
  localStorage.setItem(dismissedStorageKey(userId), JSON.stringify(list))
}
