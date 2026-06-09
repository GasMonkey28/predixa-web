import { NextRequest, NextResponse } from 'next/server'

import { requireUserId } from '@/lib/server/cognito-request-auth'
import { resolveRedirectUri, getTradeStationCredentials } from '@/lib/server/tradestation-config'
import { getTradeStationConnection } from '@/lib/server/tradestation-storage'
import { fetchTradeStationAccounts, getValidAccessToken } from '@/lib/server/tradestation-client'

export async function GET(request: NextRequest) {
  const userId = requireUserId(request)
  if (!userId) {
    return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 })
  }

  const configured = Boolean(getTradeStationCredentials())
  const connection = await getTradeStationConnection(userId)

  if (!connection) {
    return NextResponse.json({
      connected: false,
      configured,
      redirectUri: resolveRedirectUri(request),
    })
  }

  try {
    const { connection: refreshed } = await getValidAccessToken(userId)
    const accounts = await fetchTradeStationAccounts(refreshed.accessToken)

    return NextResponse.json({
      connected: true,
      configured,
      redirectUri: resolveRedirectUri(request),
      expiresAt: refreshed.expiresAt,
      selectedAccountId: refreshed.selectedAccountId,
      accounts: accounts.map((account) => ({
        id: account.AccountID,
        type: account.AccountType,
        alias: account.Alias,
      })),
    })
  } catch (error) {
    console.error('TradeStation status error:', error)
    return NextResponse.json({
      connected: true,
      configured,
      redirectUri: resolveRedirectUri(request),
      selectedAccountId: connection.selectedAccountId,
      accounts: connection.accountIds.map((id) => ({ id })),
      stale: true,
    })
  }
}
