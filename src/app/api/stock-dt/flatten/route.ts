import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import { isStockPosition } from '@/lib/server/stock-dt'
import {
  fetchTradeStationPositions,
  getValidAccessToken,
  placeTradeStationOrder,
} from '@/lib/server/tradestation-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

  let accountId: string | undefined
  try {
    const body = (await request.json()) as { accountId?: string }
    accountId = body.accountId
  } catch {
    // optional body
  }

  try {
    const { accessToken, connection } = await getValidAccessToken(auth.userId)
    const id = accountId || connection.selectedAccountId
    if (!id) {
      return NextResponse.json({ error: 'No paper account selected' }, { status: 400 })
    }

    const positions = await fetchTradeStationPositions(accessToken, [id], 'sim')
    const stockPositions = positions.filter((p) => isStockPosition(p.Symbol, p.AssetType))

    const results: Array<{ symbol: string; ok: boolean; orderId?: string; message?: string }> = []

    for (const position of stockPositions) {
      const qty = Math.abs(Number(position.Quantity))
      if (!Number.isFinite(qty) || qty <= 0) continue

      const isLong = (position.LongShort || '').toLowerCase().startsWith('long')
      try {
        const placed = await placeTradeStationOrder(
          accessToken,
          {
            AccountID: id,
            Symbol: position.Symbol,
            Quantity: String(qty),
            OrderType: 'Market',
            TradeAction: isLong ? 'SELL' : 'BUYTOCOVER',
            TimeInForce: { Duration: 'DAY' },
            Route: 'Intelligent',
          },
          'sim'
        )
        results.push({
          symbol: position.Symbol,
          ok: Boolean(placed.Orders?.[0]?.OrderID),
          orderId: placed.Orders?.[0]?.OrderID,
          message: placed.Errors?.[0]?.Message || placed.Orders?.[0]?.Message,
        })
      } catch (error) {
        results.push({
          symbol: position.Symbol,
          ok: false,
          message: (error as Error).message,
        })
      }
    }

    return NextResponse.json(
      {
        accountId: id,
        closed: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
      },
      { headers: getRateLimitHeaders(clientIp) }
    )
  } catch (error) {
    logger.error({ error, userId: auth.userId }, 'Stock DT flatten error')
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to flatten' },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}
