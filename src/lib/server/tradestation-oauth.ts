import {
  TRADESTATION_TOKEN_URL,
  getTradeStationCredentials,
} from '@/lib/server/tradestation-config'

export interface TradeStationTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

async function postToken(body: URLSearchParams): Promise<TradeStationTokenResponse> {
  const creds = getTradeStationCredentials()
  if (!creds) throw new Error('TradeStation credentials are not configured')

  body.set('client_id', creds.clientId)
  body.set('client_secret', creds.clientSecret)

  const response = await fetch(TRADESTATION_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  })

  const data = (await response.json()) as TradeStationTokenResponse & {
    error?: string
    error_description?: string
  }

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'TradeStation token request failed')
  }

  return data
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string
): Promise<TradeStationTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })
  return postToken(body)
}

export async function refreshAccessToken(refreshToken: string): Promise<TradeStationTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  return postToken(body)
}
