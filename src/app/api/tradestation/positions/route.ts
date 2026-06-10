import { NextRequest, NextResponse } from 'next/server'

import { requireUserId } from '@/lib/server/cognito-request-auth'
import {
  fetchTradeStationPositions,
  getValidAccessToken,
} from '@/lib/server/tradestation-client'
import { calcTradeStationPositionSummary } from '@/lib/tradestation-map'

export async function GET(request: NextRequest) {
  const userId = requireUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { accessToken, connection } = await getValidAccessToken(userId)
    const accountIds = connection.selectedAccountId
      ? [connection.selectedAccountId]
      : connection.accountIds

    const positions = await fetchTradeStationPositions(accessToken, accountIds)
    const summary = calcTradeStationPositionSummary(positions)

    return NextResponse.json({
      success: true,
      accountIds,
      positions,
      summary,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load positions'
    console.error('TradeStation positions error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
