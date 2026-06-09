import { refreshAccessToken } from '@/lib/server/tradestation-oauth'
import { TRADESTATION_API_BASE } from '@/lib/server/tradestation-config'
import {
  getTradeStationConnection,
  saveTradeStationConnection,
  TradeStationConnection,
} from '@/lib/server/tradestation-storage'

export interface TradeStationAccount {
  AccountID: string
  AccountType?: string
  Alias?: string
  Status?: string
}

export interface TradeStationPosition {
  AccountID: string
  PositionID: string
  Symbol: string
  Quantity: string
  LongShort: 'Long' | 'Short' | string
  AveragePrice: string
  AssetType?: string
  Timestamp?: string
}

async function tradeStationFetch<T>(
  accessToken: string,
  path: string
): Promise<T> {
  const response = await fetch(`${TRADESTATION_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  const data = (await response.json()) as T & { Message?: string; error?: string }
  if (!response.ok) {
    throw new Error(
      (data as { Message?: string }).Message ||
        (data as { error?: string }).error ||
        `TradeStation API error (${response.status})`
    )
  }
  return data
}

export async function getValidAccessToken(userId: string): Promise<{
  accessToken: string
  connection: TradeStationConnection
}> {
  const connection = await getTradeStationConnection(userId)
  if (!connection) throw new Error('TradeStation is not connected')

  const expiresAt = new Date(connection.expiresAt).getTime()
  if (Date.now() < expiresAt - 60_000) {
    return { accessToken: connection.accessToken, connection }
  }

  const refreshed = await refreshAccessToken(connection.refreshToken)
  const updated: TradeStationConnection = {
    ...connection,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || connection.refreshToken,
    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    scope: refreshed.scope || connection.scope,
    updatedAt: new Date().toISOString(),
  }
  await saveTradeStationConnection(updated)
  return { accessToken: updated.accessToken, connection: updated }
}

export async function fetchTradeStationAccounts(accessToken: string): Promise<TradeStationAccount[]> {
  const data = await tradeStationFetch<{ Accounts?: TradeStationAccount[] }>(
    accessToken,
    '/brokerage/accounts'
  )
  return data.Accounts ?? []
}

export async function fetchTradeStationPositions(
  accessToken: string,
  accountIds: string[]
): Promise<TradeStationPosition[]> {
  if (accountIds.length === 0) return []
  const data = await tradeStationFetch<{ Positions?: TradeStationPosition[] }>(
    accessToken,
    `/brokerage/accounts/${accountIds.join(',')}/positions`
  )
  return data.Positions ?? []
}
