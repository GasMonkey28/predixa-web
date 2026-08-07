import { NextRequest, NextResponse } from 'next/server'

import { buildDtPnlSnapshot } from '@/lib/server/dt-pnl'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import {
  fetchTradeStationCurrentOrders,
  fetchTradeStationHistoricalOrders,
  fetchTradeStationPositions,
  getValidAccessToken,
  historicalOrdersSinceDate,
  mergeTradeStationOrders,
} from '@/lib/server/tradestation-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

    const daysBackRaw = Number(request.nextUrl.searchParams.get('daysBack') || 89)
    const daysBack = Number.isFinite(daysBackRaw) ? Math.min(89, Math.max(7, daysBackRaw)) : 89
    const since = historicalOrdersSinceDate(daysBack)

    const [historical, current, positions] = await Promise.all([
      fetchTradeStationHistoricalOrders(accessToken, [accountId], since, 'sim'),
      fetchTradeStationCurrentOrders(accessToken, [accountId], 'sim'),
      fetchTradeStationPositions(accessToken, [accountId], 'sim'),
    ])

    const orders = mergeTradeStationOrders(historical, current)
    const snapshot = buildDtPnlSnapshot({
      asset: 'option',
      orders,
      positions,
    })

    return NextResponse.json(
      {
        accountId,
        orderCount: orders.length,
        positionCount: positions.length,
        ...snapshot,
      },
      { headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  } catch (error) {
    logger.error({ error, userId: auth.userId }, 'Option DT pnl error')
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to load P&L calendar' },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}
