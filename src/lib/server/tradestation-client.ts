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

export interface TradeStationOrderLeg {
  Symbol: string
  BuyOrSell?: string
  OpenOrClose?: string
  ExecutionPrice?: string
  ExecQuantity?: string
  QuantityOrdered?: string
  AssetType?: string
}

export interface TradeStationOrder {
  OrderID: string
  AccountID?: string
  OpenedDateTime?: string
  ClosedDateTime?: string
  Status?: string
  FilledPrice?: string
  PriceUsedForBuyingPower?: string
  Legs?: TradeStationOrderLeg[]
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

export function historicalOrdersSinceDate(daysBack = 89): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.min(Math.max(daysBack, 1), 89))
  return date.toISOString().slice(0, 10)
}

export async function fetchTradeStationHistoricalOrders(
  accessToken: string,
  accountIds: string[],
  since: string
): Promise<TradeStationOrder[]> {
  if (accountIds.length === 0) return []

  const orders: TradeStationOrder[] = []
  let nextToken: string | undefined

  do {
    const params = new URLSearchParams({ since, pageSize: '600' })
    if (nextToken) params.set('nextToken', nextToken)

    const data = await tradeStationFetch<{
      Orders?: TradeStationOrder[]
      NextToken?: string
    }>(accessToken, `/brokerage/accounts/${accountIds.join(',')}/historicalorders?${params}`)

    orders.push(...(data.Orders ?? []))
    nextToken = data.NextToken
  } while (nextToken)

  return orders
}

/** Today's and still-open orders (not in historical until closed/moved). */
export async function fetchTradeStationCurrentOrders(
  accessToken: string,
  accountIds: string[]
): Promise<TradeStationOrder[]> {
  if (accountIds.length === 0) return []

  const orders: TradeStationOrder[] = []
  let nextToken: string | undefined

  do {
    const params = new URLSearchParams()
    if (nextToken) params.set('nextToken', nextToken)

    const query = params.toString()
    const path = `/brokerage/accounts/${accountIds.join(',')}/orders${query ? `?${query}` : ''}`

    const data = await tradeStationFetch<{
      Orders?: TradeStationOrder[]
      NextToken?: string
    }>(accessToken, path)

    orders.push(...(data.Orders ?? []))
    nextToken = data.NextToken
  } while (nextToken)

  return orders
}

export function mergeTradeStationOrders(
  ...lists: TradeStationOrder[][]
): TradeStationOrder[] {
  const byId = new Map<string, TradeStationOrder>()
  for (const list of lists) {
    for (const order of list) {
      byId.set(order.OrderID, order)
    }
  }
  return Array.from(byId.values())
}
