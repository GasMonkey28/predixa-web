import { NextRequest } from 'next/server'

export const TRADESTATION_AUTH_URL = 'https://signin.tradestation.com/authorize'
export const TRADESTATION_TOKEN_URL = 'https://signin.tradestation.com/oauth/token'
export const TRADESTATION_API_BASE = 'https://api.tradestation.com/v3'
export const TRADESTATION_SIM_API_BASE = 'https://sim-api.tradestation.com/v3'
export const TRADESTATION_AUDIENCE = 'https://api.tradestation.com'

/** Read-only journal sync scopes (legacy). Prefer TRADESTATION_TRADE_SCOPES for Option DT. */
export const TRADESTATION_READ_SCOPES = 'openid profile offline_access ReadAccount'

/** Market data + trade + option spreads — required for Option DT paper trading. */
export const TRADESTATION_TRADE_SCOPES =
  'openid profile offline_access MarketData ReadAccount Trade OptionSpreads'

/** Default authorize scopes: full trade set so one reconnect covers journal + Option DT. */
export const TRADESTATION_SCOPES = TRADESTATION_TRADE_SCOPES

export type TradeStationApiEnv = 'live' | 'sim'

export function tradeStationApiBase(env: TradeStationApiEnv = 'live'): string {
  return env === 'sim' ? TRADESTATION_SIM_API_BASE : TRADESTATION_API_BASE
}

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

/** Safe in-app path for OAuth return (no open redirect). */
export function sanitizeReturnTo(value: string | null | undefined, fallback = '/trade-journal'): string {
  if (!value) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (value.includes('://')) return fallback
  return value
}

export function connectionHasTradeScopes(scope: string | undefined | null): boolean {
  if (!scope) return false
  const parts = scope.split(/[\s,]+/).map((s) => s.toLowerCase())
  return parts.includes('trade') && parts.includes('marketdata')
}
