import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

import { requireUserId } from '@/lib/server/cognito-request-auth'
import {
  getTradeStationCredentials,
  resolveRedirectUri,
  TRADESTATION_AUDIENCE,
  TRADESTATION_AUTH_URL,
  TRADESTATION_SCOPES,
} from '@/lib/server/tradestation-config'

const STATE_COOKIE = 'ts_oauth_state'

export async function GET(request: NextRequest) {
  const userId = requireUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to Predixa first' }, { status: 401 })
  }

  const creds = getTradeStationCredentials()
  if (!creds) {
    return NextResponse.json({ error: 'TradeStation is not configured on the server' }, { status: 503 })
  }

  const redirectUri = resolveRedirectUri(request)
  const state = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: creds.clientId,
    audience: TRADESTATION_AUDIENCE,
    redirect_uri: redirectUri,
    scope: TRADESTATION_SCOPES,
    state,
    prompt: 'login',
  })

  const response = NextResponse.redirect(`${TRADESTATION_AUTH_URL}?${params.toString()}`)
  response.cookies.set(
    STATE_COOKIE,
    JSON.stringify({ userId, state, redirectUri }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    }
  )
  return response
}
