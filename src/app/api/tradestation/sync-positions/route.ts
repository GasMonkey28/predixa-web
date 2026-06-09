import { NextRequest, NextResponse } from 'next/server'

import { requireUserId } from '@/lib/server/cognito-request-auth'
import {
  fetchTradeStationPositions,
  getValidAccessToken,
} from '@/lib/server/tradestation-client'
import { mapPositionToJournalEntry } from '@/lib/tradestation-map'

export async function POST(request: NextRequest) {
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
    const entries = positions.map((position) => mapPositionToJournalEntry(position))

    return NextResponse.json({
      success: true,
      count: entries.length,
      entries,
      accountIds,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync positions'
    console.error('TradeStation sync error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
