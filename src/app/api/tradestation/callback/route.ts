import { NextRequest, NextResponse } from 'next/server'

import { exchangeAuthorizationCode } from '@/lib/server/tradestation-oauth'
import { saveTradeStationConnection } from '@/lib/server/tradestation-storage'
import { fetchTradeStationAccounts } from '@/lib/server/tradestation-client'

const STATE_COOKIE = 'ts_oauth_state'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const journalUrl = new URL('/trade-journal', origin)

  const error = request.nextUrl.searchParams.get('error')
  if (error) {
    journalUrl.searchParams.set('ts', 'denied')
    return NextResponse.redirect(journalUrl)
  }

  const code = request.nextUrl.searchParams.get('code')
  const returnedState = request.nextUrl.searchParams.get('state')
  const stateCookie = request.cookies.get(STATE_COOKIE)?.value

  if (!code || !returnedState || !stateCookie) {
    journalUrl.searchParams.set('ts', 'error')
    return NextResponse.redirect(journalUrl)
  }

  let parsed: { userId: string; state: string; redirectUri: string }
  try {
    parsed = JSON.parse(stateCookie) as { userId: string; state: string; redirectUri: string }
  } catch {
    journalUrl.searchParams.set('ts', 'error')
    return NextResponse.redirect(journalUrl)
  }

  if (parsed.state !== returnedState) {
    journalUrl.searchParams.set('ts', 'error')
    return NextResponse.redirect(journalUrl)
  }

  try {
    const tokens = await exchangeAuthorizationCode(code, parsed.redirectUri)
    const accounts = await fetchTradeStationAccounts(tokens.access_token)
    const accountIds = accounts.map((account) => account.AccountID).filter(Boolean)
    const futuresAccount =
      accounts.find((account) => account.AccountType?.toLowerCase().includes('future')) ??
      accounts[0]

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

    journalUrl.searchParams.set('ts', 'connected')
    const response = NextResponse.redirect(journalUrl)
    response.cookies.delete(STATE_COOKIE)
    return response
  } catch (err) {
    console.error('TradeStation callback error:', err)
    journalUrl.searchParams.set('ts', 'error')
    return NextResponse.redirect(journalUrl)
  }
}
