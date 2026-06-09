import { NextRequest, NextResponse } from 'next/server'

import { requireUserId } from '@/lib/server/cognito-request-auth'
import { deleteTradeStationConnection } from '@/lib/server/tradestation-storage'

export async function POST(request: NextRequest) {
  const userId = requireUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await deleteTradeStationConnection(userId)
  return NextResponse.json({ success: true })
}
