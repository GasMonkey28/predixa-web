import { NextRequest, NextResponse } from 'next/server'

import { dayMoveFromQuote } from '@/lib/dt-quotes'
import { tradingDayFromTimestamp } from '@/lib/dt-position-days'
import {
  loadOpenLotEntryDates,
  positionEntryKey,
} from '@/lib/server/dt-position-entry-dates'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import { isStockPosition, loadReclaimExitLevels, type StockDtReclaimExits } from '@/lib/server/stock-dt'
import {
  fetchQuoteSnapshots,
  fetchTradeStationBalances,
  fetchTradeStationCurrentOrders,
  fetchTradeStationPositions,
  getValidAccessToken,
  type TradeStationOrder,
  type TradeStationPosition,
  type TradeStationQuote,
} from '@/lib/server/tradestation-client'

export const dynamic = 'force-dynamic'

function orderRejectMessage(order: TradeStationOrder): string | null {
  const extras = (order.Messages || [])
    .map((m) => (typeof m === 'string' ? m : m.Message || m.Description || ''))
    .filter(Boolean)
  const desc = order.StatusDescription?.trim()
  const reason = order.RejectReason?.trim()
  const parts = [
    reason && reason.toLowerCase() !== 'rejected' ? reason : null,
    desc && desc.toLowerCase() !== 'rejected' ? desc : null,
    ...extras,
  ].filter(Boolean) as string[]
  if (parts.length > 0) return parts.join(' · ')
  return desc || reason || null
}

function toNum(value: string | number | undefined | null): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapStockPosition(
  p: TradeStationPosition,
  entryDates: Map<string, string>,
  quotesBySymbol: Map<string, TradeStationQuote>
) {
  const qty = Math.abs(toNum(p.Quantity))
  const avg = toNum(p.AveragePrice)
  const last = toNum(p.Last)
  const marketValue = toNum(p.MarketValue) || qty * last
  const totalCost = toNum(p.TotalCost) || qty * avg
  const unrealized = toNum(p.UnrealizedProfitLoss) || marketValue - totalCost
  const isLong = (p.LongShort || '').toLowerCase().startsWith('long')
  const longShort = isLong ? 'Long' : 'Short'
  const fromOrders = entryDates.get(positionEntryKey(p.Symbol, longShort))
  const move = dayMoveFromQuote(quotesBySymbol.get(p.Symbol.toUpperCase()))

  return {
    positionId: p.PositionID,
    symbol: p.Symbol,
    quantity: qty,
    longShort,
    averagePrice: avg,
    last: move.last ?? (last || null),
    previousClose: move.previousClose,
    netChange: move.netChange,
    netChangePct: move.netChangePct,
    marketValue,
    totalCost,
    unrealizedPnl: unrealized,
    todaysPnl: toNum(p.TodaysProfitLoss) || null,
    assetType: p.AssetType || null,
    entryDate: fromOrders || tradingDayFromTimestamp(p.Timestamp),
    timestamp: p.Timestamp || null,
  }
}

export async function GET(request: NextRequest) {
  const clientIp =
    (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(clientIp) }
    )
  }

  const auth = await requireSubscriber(request)
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: getRateLimitHeaders(clientIp) }
    )
  }

  try {
    const { accessToken, connection } = await getValidAccessToken(auth.userId)
    const accountId =
      request.nextUrl.searchParams.get('accountId') || connection.selectedAccountId
    if (!accountId) {
      return NextResponse.json({ error: 'No paper account selected' }, { status: 400 })
    }

    const [raw, currentOrders, balances] = await Promise.all([
      fetchTradeStationPositions(accessToken, [accountId], 'sim'),
      fetchTradeStationCurrentOrders(accessToken, [accountId], 'sim').catch(() => [] as TradeStationOrder[]),
      fetchTradeStationBalances(accessToken, [accountId], 'sim').catch(() => []),
    ])
    let entryDates = new Map<string, string>()
    try {
      entryDates = await loadOpenLotEntryDates(accessToken, accountId)
    } catch (err) {
      logger.warn({ err, userId: auth.userId }, 'Stock DT entry-date fill lookup failed; using position timestamps')
    }

    const stockRaw = raw.filter((p) => isStockPosition(p.Symbol, p.AssetType))
    const quotesBySymbol = new Map<string, TradeStationQuote>()
    const symbols = Array.from(
      new Set(stockRaw.map((p) => p.Symbol?.toUpperCase()).filter(Boolean) as string[])
    )
    if (symbols.length > 0) {
      try {
        const quotes = await fetchQuoteSnapshots(accessToken, symbols)
        for (const q of quotes) {
          if (q.Symbol) quotesBySymbol.set(q.Symbol.toUpperCase(), q)
        }
      } catch (err) {
        logger.warn(
          { err, userId: auth.userId, symbols: symbols.slice(0, 5) },
          'Stock DT positions: quote enrichment failed'
        )
      }
    }

    const positionsBase = stockRaw.map((p) => mapStockPosition(p, entryDates, quotesBySymbol))

    let reclaimBySymbol = new Map<
      string,
      { long?: StockDtReclaimExits; short?: StockDtReclaimExits }
    >()
    try {
      reclaimBySymbol = await loadReclaimExitLevels(positionsBase.map((p) => p.symbol))
    } catch (err) {
      logger.warn({ err, userId: auth.userId }, 'Stock DT positions: reclaim exits lookup failed')
    }

    const positions = positionsBase.map((p) => {
      const side = p.longShort === 'Short' ? 'short' : 'long'
      const exits = reclaimBySymbol.get(p.symbol.toUpperCase())?.[side]
      return {
        ...p,
        targetClose: exits?.targetClose ?? null,
        stopLoss: exits?.stopLoss ?? null,
      }
    })

    const totals = positions.reduce(
      (acc, p) => {
        acc.marketValue += p.marketValue
        acc.totalCost += p.totalCost
        acc.unrealizedPnl += p.unrealizedPnl
        acc.shares += p.quantity
        return acc
      },
      { marketValue: 0, totalCost: 0, unrealizedPnl: 0, shares: 0 }
    )

    const workingOrders = currentOrders
      .map((order) => {
        const status = (order.Status || '').toUpperCase()
        const symbol =
          order.Symbol ||
          order.Legs?.find((leg) => leg.Symbol)?.Symbol ||
          ''
        const qty =
          Number(order.Quantity) ||
          Number(order.Legs?.[0]?.QuantityRemaining) ||
          Number(order.Legs?.[0]?.QuantityOrdered) ||
          0
        return {
          orderId: order.OrderID,
          symbol,
          side: order.Side || order.TradeAction || '',
          status: order.Status || '',
          quantity: Number.isFinite(qty) ? Math.abs(qty) : 0,
          message: orderRejectMessage(order),
          filled: status === 'FLL' || status === 'FPR',
          working: !['FLL', 'REJ', 'CAN', 'EXP', 'OUT'].includes(status),
        }
      })
      .filter((o) => o.orderId && (o.working || o.status.toUpperCase() === 'REJ'))

    return NextResponse.json(
      {
        accountId,
        generated_at: new Date().toISOString(),
        positions,
        workingOrders,
        totals,
        buyingPower: toNum(balances[0]?.BuyingPower) || null,
        cashBalance: toNum(balances[0]?.CashBalance) || null,
        overnightBuyingPower: toNum(balances[0]?.BalanceDetail?.OvernightBuyingPower) || null,
      },
      { headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  } catch (error) {
    logger.error({ error, userId: auth.userId }, 'Stock DT positions error')
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to load positions' },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}
