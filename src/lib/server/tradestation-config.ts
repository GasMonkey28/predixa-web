import { NextRequest } from 'next/server'

export const TRADESTATION_AUTH_URL = 'https://signin.tradestation.com/authorize'
export const TRADESTATION_TOKEN_URL = 'https://signin.tradestation.com/oauth/token'
export const TRADESTATION_API_BASE = 'https://api.tradestation.com/v3'
export const TRADESTATION_AUDIENCE = 'https://api.tradestation.com'
export const TRADESTATION_SCOPES = 'openid profile offline_access ReadAccount'

export function getTradeStationCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.TRADESTATION_CLIENT_ID?.trim()
  const clientSecret = process.env.TRADESTATION_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

/** Use the live site origin in production so Vercel localhost redirect does not break prod. */
export function resolveRedirectUri(request: NextRequest): string {
  const configured = process.env.TRADESTATION_REDIRECT_URI?.trim()
  const origin = request.nextUrl.origin
  const dynamic = `${origin}/api/tradestation/callback`

  if (!configured) return dynamic
  if (origin.includes('localhost')) return configured
  if (configured.includes('localhost')) return dynamic
  return configured
}
