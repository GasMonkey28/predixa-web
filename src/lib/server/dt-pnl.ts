import { tradingDayFromTimestamp, todayTradingDay } from '@/lib/dt-position-days'
import type {
  DtPnlAsset,
  DtPnlDay,
  DtPnlMonth,
  DtPnlSnapshot,
} from '@/lib/dt-pnl-types'
import type { TradeStationOrder, TradeStationPosition } from '@/lib/server/tradestation-client'

export type { DtPnlAsset, DtPnlDay, DtPnlMonth, DtPnlSnapshot } from '@/lib/dt-pnl-types'

type OpenLot = {
  symbol: string
  isShort: boolean
  size: number
  price: number
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

function parsePrice(value: string | number | undefined | null): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
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

function isOptionLike(symbol: string, assetType?: string | null): boolean {
  const asset = (assetType || '').toLowerCase()
  return asset.includes('option') || /\d{6}[CP]/i.test(symbol) || symbol.includes(' ')
}

function matchesAsset(
  asset: DtPnlAsset,
  symbol: string,
  assetType?: string | null
): boolean {
  const option = isOptionLike(symbol, assetType)
  return asset === 'option' ? option : !option
}

function monthKeyFromDate(date: string): string {
  return date.slice(0, 7)
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  if (!y || !m) return monthKey
  const date = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0))
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

type DayAcc = {
  realizedPnl: number
  openUnrealizedPnl: number
  closedTrades: number
  openPositions: number
}

function ensureDay(map: Map<string, DayAcc>, date: string): DayAcc {
  let row = map.get(date)
  if (!row) {
    row = { realizedPnl: 0, openUnrealizedPnl: 0, closedTrades: 0, openPositions: 0 }
    map.set(date, row)
  }
  return row
}

function normalizeSide(order: TradeStationOrder): string {
  return (order.Side || order.TradeAction || '').toLowerCase().replace(/[\s_-]/g, '')
}

/**
 * Resolve open vs close for a fill.
 * Options usually have OpenOrClose; equities often only have Buy/Sell + Side.
 */
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
    // Sell closes long; Buy closes short
    return { kind: 'close', isShort: buyOrSell !== 'sell' }
  }

  if (
    side.includes('buytocover') ||
    side.includes('buytoclose') ||
    side.includes('selltoclose')
  ) {
    const isShort = side.includes('buytocover') || side.includes('buytoclose')
    return { kind: 'close', isShort }
  }
  if (side.includes('sellshort') || side.includes('selltoopen')) {
    return { kind: 'open', isShort: true }
  }
  if (side.includes('buytoopen') || side === 'buy') {
    return { kind: 'open', isShort: false }
  }
  if (side === 'sell') {
    // Equity Sell: close long if open, else open short
    const longQ = queues.get(queueKey(leg.Symbol, false)) ?? []
    if (longQ.length > 0) return { kind: 'close', isShort: false }
    return { kind: 'open', isShort: true }
  }

  // Leg-only Buy/Sell with no Side: net against opposite queue when possible
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

function openLot(
  queues: Map<string, OpenLot[]>,
  lot: OpenLot
): void {
  const key = queueKey(lot.symbol, lot.isShort)
  const queue = queues.get(key) ?? []
  queue.push(lot)
  queues.set(key, queue)
}

function closeLots(params: {
  queues: Map<string, OpenLot[]>
  byDay: Map<string, DayAcc>
  symbol: string
  isShort: boolean
  qty: number
  closePx: number
  multiplier: number
}): void {
  const { queues, byDay, symbol, isShort, closePx, multiplier } = params
  const key = queueKey(symbol, isShort)
  const queue = queues.get(key) ?? []
  let remaining = params.qty

  while (remaining > 0 && queue.length > 0) {
    const open = queue[0]!
    const take = Math.min(open.size, remaining)
    const pnl = open.isShort
      ? (open.price - closePx) * take * multiplier
      : (closePx - open.price) * take * multiplier

    const day = ensureDay(byDay, open.entryDate)
    day.realizedPnl += pnl
    day.closedTrades += 1

    open.size -= take
    remaining -= take
    if (open.size <= 0) queue.shift()
  }
  queues.set(key, queue)
}

/**
 * Build DT P&L calendar data.
 * Closed trade P&L and open unrealized are attributed to the **entry (open) day**.
 */
export function buildDtPnlSnapshot(params: {
  asset: DtPnlAsset
  orders: TradeStationOrder[]
  positions: TradeStationPosition[]
}): DtPnlSnapshot {
  const { asset, orders, positions } = params
  const multiplier = asset === 'option' ? 100 : 1
  const byDay = new Map<string, DayAcc>()

  const sorted = [...orders].sort((a, b) => orderTimestampMs(a) - orderTimestampMs(b))
  const queues = new Map<string, OpenLot[]>()

  for (const order of sorted) {
    const entryDate = tradingDayFromTimestamp(order.OpenedDateTime || order.ClosedDateTime)

    for (const leg of order.Legs ?? []) {
      const symbol = leg.Symbol
      if (!symbol) continue
      if (!matchesAsset(asset, symbol, leg.AssetType)) continue

      const qty = legFillQuantity(leg, order)
      if (qty <= 0) continue
      const price = legFillPrice(leg, order)
      if (price == null || price <= 0) continue

      const intent = resolveFillIntent(order, leg, queues)
      if (!intent) continue

      const absPx = Math.abs(price)
      if (intent.kind === 'open') {
        openLot(queues, {
          symbol,
          isShort: intent.isShort,
          size: qty,
          price: absPx,
          entryDate,
        })
      } else {
        closeLots({
          queues,
          byDay,
          symbol,
          isShort: intent.isShort,
          qty,
          closePx: absPx,
          multiplier,
        })
      }
    }
  }

  // Open positions: unrealized on entry day
  for (const p of positions) {
    if (!matchesAsset(asset, p.Symbol, p.AssetType)) continue
    const qty = Math.abs(Number(p.Quantity))
    if (!Number.isFinite(qty) || qty <= 0) continue

    const isLong = (p.LongShort || '').toLowerCase().startsWith('long')
    const key = queueKey(p.Symbol, !isLong)
    const lots = queues.get(key) ?? []
    const entryDate =
      lots.length > 0
        ? lots.reduce(
            (earliest, lot) => (lot.entryDate < earliest ? lot.entryDate : earliest),
            lots[0]!.entryDate
          )
        : tradingDayFromTimestamp(p.Timestamp)

    const unrealized = Number(p.UnrealizedProfitLoss)
    const pnl = Number.isFinite(unrealized)
      ? unrealized
      : (() => {
          const last = Number(p.Last)
          const avg = Number(p.AveragePrice)
          if (!Number.isFinite(last) || !Number.isFinite(avg)) return 0
          const raw = isLong ? (last - avg) * qty : (avg - last) * qty
          return raw * multiplier
        })()

    const day = ensureDay(byDay, entryDate)
    day.openUnrealizedPnl += pnl
    day.openPositions += 1
  }

  const today = todayTradingDay()
  const dayDates = [...byDay.keys()].sort()
  const from = dayDates[0] || today
  const to = dayDates[dayDates.length - 1] || today

  const days: DtPnlDay[] = dayDates.map((date) => {
    const row = byDay.get(date)!
    const pnl = round2(row.realizedPnl + row.openUnrealizedPnl)
    return {
      date,
      pnl,
      realizedPnl: round2(row.realizedPnl),
      openUnrealizedPnl: round2(row.openUnrealizedPnl),
      closedTrades: row.closedTrades,
      openPositions: row.openPositions,
      isProfitDay: pnl > 0,
    }
  })

  const monthMap = new Map<
    string,
    { pnl: number; profitDays: number; lossDays: number; tradeDays: number; closedTrades: number }
  >()

  for (const day of days) {
    const key = monthKeyFromDate(day.date)
    const month = monthMap.get(key) ?? {
      pnl: 0,
      profitDays: 0,
      lossDays: 0,
      tradeDays: 0,
      closedTrades: 0,
    }
    month.pnl += day.pnl
    month.tradeDays += 1
    month.closedTrades += day.closedTrades
    if (day.pnl > 0) month.profitDays += 1
    else if (day.pnl < 0) month.lossDays += 1
    monthMap.set(key, month)
  }

  const monthKeys = [...monthMap.keys()].sort()
  let running = 0
  const months: DtPnlMonth[] = monthKeys.map((monthKey) => {
    const m = monthMap.get(monthKey)!
    running = round2(running + m.pnl)
    return {
      monthKey,
      label: formatMonthLabel(monthKey),
      pnl: round2(m.pnl),
      accumulatedPnl: running,
      profitDays: m.profitDays,
      lossDays: m.lossDays,
      tradeDays: m.tradeDays,
      closedTrades: m.closedTrades,
    }
  })

  const totals = {
    pnl: round2(days.reduce((s, d) => s + d.pnl, 0)),
    accumulatedPnl: months.length > 0 ? months[months.length - 1]!.accumulatedPnl : 0,
    profitDays: days.filter((d) => d.pnl > 0).length,
    lossDays: days.filter((d) => d.pnl < 0).length,
    tradeDays: days.length,
    closedTrades: days.reduce((s, d) => s + d.closedTrades, 0),
  }

  return {
    asset,
    generated_at: new Date().toISOString(),
    today,
    days,
    months,
    totals,
    range: { from, to },
  }
}
