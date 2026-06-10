import { NextRequest, NextResponse } from 'next/server'

import { requireUserId } from '@/lib/server/cognito-request-auth'
import {
  fetchTradeStationHistoricalOrders,
  getValidAccessToken,
  historicalOrdersSinceDate,
} from '@/lib/server/tradestation-client'
import { extractRecentFillsFromOrders } from '@/lib/tradestation-recent-fills'

export async function GET(request: NextRequest) {
  const userId = requireUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(Number(limitParam) || 6, 1), 20)
  const daysParam = request.nextUrl.searchParams.get('days')
  const days = Math.min(Math.max(Number(daysParam) || 14, 1), 30)

  try {
    const { accessToken, connection } = await getValidAccessToken(userId)
    const accountIds = connection.selectedAccountId
      ? [connection.selectedAccountId]
      : connection.accountIds

    const since = historicalOrdersSinceDate(days)
    const orders = await fetchTradeStationHistoricalOrders(accessToken, accountIds, since)
    const fills = extractRecentFillsFromOrders(orders, limit)

    return NextResponse.json({
      success: true,
      since,
      limit,
      fills,
      orderCount: orders.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load recent fills'
    console.error('TradeStation recent fills error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
