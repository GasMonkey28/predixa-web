import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import { isStockPosition } from '@/lib/server/stock-dt'
import { connectionHasTradeScopes } from '@/lib/server/tradestation-config'
import {
  fetchTradeStationPositions,
  getValidAccessToken,
  placeTradeStationOrder,
  type TradeStationOrderRequest,
} from '@/lib/server/tradestation-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type AdjustAction = 'buy_more' | 'sell_one' | 'flatten'

interface AdjustBody {
  accountId?: string
  symbol?: string
  action?: AdjustAction
  /** Extra shares to buy (buy_more) or sell (sell_one). Default 1. */
  quantity?: number
}

export async function POST(request: NextRequest) {
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

  let body: AdjustBody
  try {
    body = (await request.json()) as AdjustBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const symbol = (body.symbol || '').trim().toUpperCase()
  const action = body.action
  if (!symbol || (action !== 'buy_more' && action !== 'sell_one' && action !== 'flatten')) {
    return NextResponse.json(
      { error: 'symbol and action (buy_more|sell_one|flatten) are required' },
      { status: 400 }
    )
  }

  try {
    const { accessToken, connection } = await getValidAccessToken(auth.userId)
    if (!connectionHasTradeScopes(connection.scope)) {
      return NextResponse.json(
        { error: 'Missing Trade/MarketData scopes. Reconnect TradeStation.' },
        { status: 400, headers: getRateLimitHeaders(clientIp) }
      )
    }

    const accountId = body.accountId || connection.selectedAccountId
    if (!accountId) {
      return NextResponse.json({ error: 'Select a paper account first' }, { status: 400 })
    }

    const positions = await fetchTradeStationPositions(accessToken, [accountId], 'sim')
    const position = positions.find(
      (p) => p.Symbol?.toUpperCase() === symbol && isStockPosition(p.Symbol, p.AssetType)
    )
    if (!position) {
      return NextResponse.json(
        { error: `No open stock position for ${symbol}` },
        { status: 404 }
      )
    }

    const openQty = Math.abs(Number(position.Quantity))
    if (!Number.isFinite(openQty) || openQty <= 0) {
      return NextResponse.json({ error: 'Invalid position quantity' }, { status: 400 })
    }

    const isLong = (position.LongShort || '').toLowerCase().startsWith('long')
    let order: TradeStationOrderRequest

    if (action === 'buy_more') {
      const addQty = Math.max(1, Math.min(Math.floor(body.quantity ?? 1), 500))
      order = {
        AccountID: accountId,
        Symbol: symbol,
        Quantity: String(addQty),
        OrderType: 'Market',
        TradeAction: isLong ? 'BUY' : 'SELLSHORT',
        TimeInForce: { Duration: 'DAY' },
        Route: 'Intelligent',
      }
    } else if (action === 'sell_one') {
      const sellQty = Math.max(1, Math.min(Math.floor(body.quantity ?? 1), openQty))
      order = {
        AccountID: accountId,
        Symbol: symbol,
        Quantity: String(sellQty),
        OrderType: 'Market',
        TradeAction: isLong ? 'SELL' : 'BUYTOCOVER',
        TimeInForce: { Duration: 'DAY' },
        Route: 'Intelligent',
      }
    } else {
      order = {
        AccountID: accountId,
        Symbol: symbol,
        Quantity: String(openQty),
        OrderType: 'Market',
        TradeAction: isLong ? 'SELL' : 'BUYTOCOVER',
        TimeInForce: { Duration: 'DAY' },
        Route: 'Intelligent',
      }
    }

    const placed = await placeTradeStationOrder(accessToken, order, 'sim')
    const orderId = placed.Orders?.[0]?.OrderID
    const message =
      placed.Errors?.[0]?.Message ||
      placed.Errors?.[0]?.Error ||
      placed.Orders?.[0]?.Error ||
      placed.Orders?.[0]?.Message

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: message || 'Order rejected', placed },
        { status: 400, headers: getRateLimitHeaders(clientIp) }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        action,
        symbol,
        orderId,
        message,
      },
      { headers: getRateLimitHeaders(clientIp) }
    )
  } catch (error) {
    logger.error({ error, userId: auth.userId }, 'Stock DT adjust error')
    return NextResponse.json(
      { error: (error as Error).message || 'Adjust failed' },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}
