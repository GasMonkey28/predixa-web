import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

import { requireUserId } from '@/lib/server/cognito-request-auth'
import {
  getTradeStationCredentials,
  resolveRedirectUri,
  sanitizeReturnTo,
  TRADESTATION_AUDIENCE,
  TRADESTATION_AUTH_URL,
  TRADESTATION_SCOPES,
} from '@/lib/server/tradestation-config'

const STATE_COOKIE = 'ts_oauth_state'

export async function GET(request: NextRequest) {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get('returnTo'))
  const failRedirect = () => {
    const url = new URL(returnTo, request.nextUrl.origin)
    url.searchParams.set('ts', 'not_configured')
    return NextResponse.redirect(url)
  }

  const userId = requireUserId(request)
  if (!userId) {
    // Browser navigations often lack Bearer; try cookie auth only.
    // If still missing, send them back with a clear flag.
    const url = new URL(returnTo, request.nextUrl.origin)
    url.searchParams.set('ts', 'signin')
    return NextResponse.redirect(url)
  }

  const creds = getTradeStationCredentials()
  if (!creds) {
    return failRedirect()
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
    JSON.stringify({ userId, state, redirectUri, returnTo }),
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
