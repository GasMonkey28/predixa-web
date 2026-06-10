import { NextRequest, NextResponse } from 'next/server'

import { requireUserId } from '@/lib/server/cognito-request-auth'
import {
  fetchTradeStationHistoricalOrders,
  getValidAccessToken,
  historicalOrdersSinceDate,
} from '@/lib/server/tradestation-client'
import { mapHistoricalOrdersToJournalEntries } from '@/lib/tradestation-map'

export async function POST(request: NextRequest) {
  const userId = requireUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let days = 89
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.days === 'number' && body.days > 0) {
      days = Math.min(Math.floor(body.days), 89)
    }
  } catch {
    // default 89 days
  }

  try {
    const { accessToken, connection } = await getValidAccessToken(userId)
    const accountIds = connection.selectedAccountId
      ? [connection.selectedAccountId]
      : connection.accountIds

    const since = historicalOrdersSinceDate(days)
    const orders = await fetchTradeStationHistoricalOrders(accessToken, accountIds, since)
    const entries = mapHistoricalOrdersToJournalEntries(orders)

    return NextResponse.json({
      success: true,
      since,
      orderCount: orders.length,
      tradeCount: entries.length,
      entries,
      accountIds,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync transactions'
    console.error('TradeStation transaction sync error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
