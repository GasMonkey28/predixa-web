import { NextRequest, NextResponse } from 'next/server'

import { exchangeAuthorizationCode } from '@/lib/server/tradestation-oauth'
import { saveTradeStationConnection } from '@/lib/server/tradestation-storage'
import { fetchTradeStationAccounts } from '@/lib/server/tradestation-client'
import { sanitizeReturnTo } from '@/lib/server/tradestation-config'

const STATE_COOKIE = 'ts_oauth_state'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const stateCookie = request.cookies.get(STATE_COOKIE)?.value

  let returnTo = '/trade-journal'
  if (stateCookie) {
    try {
      const parsedEarly = JSON.parse(stateCookie) as { returnTo?: string }
      returnTo = sanitizeReturnTo(parsedEarly.returnTo, '/trade-journal')
    } catch {
      // keep default
    }
  }

  const redirectUrl = new URL(returnTo, origin)

  const error = request.nextUrl.searchParams.get('error')
  if (error) {
    redirectUrl.searchParams.set('ts', 'denied')
    return NextResponse.redirect(redirectUrl)
  }

  const code = request.nextUrl.searchParams.get('code')
  const returnedState = request.nextUrl.searchParams.get('state')

  if (!code || !returnedState || !stateCookie) {
    redirectUrl.searchParams.set('ts', 'error')
    return NextResponse.redirect(redirectUrl)
  }

  let parsed: { userId: string; state: string; redirectUri: string; returnTo?: string }
  try {
    parsed = JSON.parse(stateCookie) as {
      userId: string
      state: string
      redirectUri: string
      returnTo?: string
    }
  } catch {
    redirectUrl.searchParams.set('ts', 'error')
    return NextResponse.redirect(redirectUrl)
  }

  if (parsed.state !== returnedState) {
    redirectUrl.searchParams.set('ts', 'error')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    const tokens = await exchangeAuthorizationCode(code, parsed.redirectUri)

    // Prefer live accounts for journal futures; also try sim for Option DT paper.
    const [liveAccounts, simAccounts] = await Promise.all([
      fetchTradeStationAccounts(tokens.access_token, 'live').catch(() => []),
      fetchTradeStationAccounts(tokens.access_token, 'sim').catch(() => []),
    ])

    const accountIds = Array.from(
      new Set([
        ...liveAccounts.map((a) => a.AccountID),
        ...simAccounts.map((a) => a.AccountID),
      ].filter(Boolean))
    )

    const futuresAccount =
      liveAccounts.find((account) => account.AccountType?.toLowerCase().includes('future')) ??
      liveAccounts[0] ??
      simAccounts[0]

    await saveTradeStationConnection({
      userId: parsed.userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope,
      accountIds,
      selectedAccountId: futuresAccount?.AccountID ?? accountIds[0] ?? null,
      updatedAt: new Date().toISOString(),
    })

    redirectUrl.searchParams.set('ts', 'connected')
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete(STATE_COOKIE)
    return response
  } catch (err) {
    console.error('TradeStation callback error:', err)
    redirectUrl.searchParams.set('ts', 'error')
    return NextResponse.redirect(redirectUrl)
  }
}
