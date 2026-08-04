import { NextRequest, NextResponse } from 'next/server'

import { requireUserId } from '@/lib/server/cognito-request-auth'
import {
  connectionHasTradeScopes,
  getTradeStationCredentials,
  resolveRedirectUri,
} from '@/lib/server/tradestation-config'
import { getTradeStationConnection } from '@/lib/server/tradestation-storage'
import { fetchTradeStationAccounts, getValidAccessToken } from '@/lib/server/tradestation-client'

export async function GET(request: NextRequest) {
  const userId = requireUserId(request)
  if (!userId) {
    return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 })
  }

  const configured = Boolean(getTradeStationCredentials())
  const connection = await getTradeStationConnection(userId)
  const includeSim = request.nextUrl.searchParams.get('sim') === '1'

  if (!connection) {
    return NextResponse.json({
      connected: false,
      configured,
      redirectUri: resolveRedirectUri(request),
      tradeScopesOk: false,
    })
  }

  try {
    const { connection: refreshed, accessToken } = await getValidAccessToken(userId)
    const liveAccounts = await fetchTradeStationAccounts(accessToken, 'live')

    let simAccounts: Awaited<ReturnType<typeof fetchTradeStationAccounts>> = []
    let simError: string | null = null
    if (includeSim) {
      try {
        simAccounts = await fetchTradeStationAccounts(accessToken, 'sim')
      } catch (error) {
        simError = (error as Error)?.message || 'sim-api accounts request failed'
        console.error('TradeStation sim accounts error:', error)
      }
    }

    return NextResponse.json({
      connected: true,
      configured,
      redirectUri: resolveRedirectUri(request),
      expiresAt: refreshed.expiresAt,
      selectedAccountId: refreshed.selectedAccountId,
      scope: refreshed.scope,
      tradeScopesOk: connectionHasTradeScopes(refreshed.scope),
      accounts: liveAccounts.map((account) => ({
        id: account.AccountID,
        type: account.AccountType,
        alias: account.Alias,
        env: 'live' as const,
      })),
      simAccounts: simAccounts.map((account) => ({
        id: account.AccountID,
        type: account.AccountType,
        alias: account.Alias,
        env: 'sim' as const,
      })),
      simError,
    })
  } catch (error) {
    console.error('TradeStation status error:', error)
    const message = (error as Error)?.message || 'status refresh failed'
    const missingCreds = /credentials are not configured/i.test(message)
    return NextResponse.json({
      connected: true,
      configured,
      redirectUri: resolveRedirectUri(request),
      selectedAccountId: connection.selectedAccountId,
      scope: connection.scope,
      tradeScopesOk: connectionHasTradeScopes(connection.scope),
      accounts: connection.accountIds.map((id) => ({ id, env: 'live' as const })),
      simAccounts: [],
      simError: missingCreds
        ? 'Server is missing TRADESTATION_CLIENT_ID / TRADESTATION_CLIENT_SECRET (common on localhost). Copy them from Vercel into .env.local and restart next, or reconnect on the deployed site.'
        : message,
      stale: true,
      missingCredentials: missingCreds || !configured,
    })
  }
}
