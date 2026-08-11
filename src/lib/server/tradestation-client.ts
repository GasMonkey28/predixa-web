import { refreshAccessToken } from '@/lib/server/tradestation-oauth'
import {
  tradeStationApiBase,
  type TradeStationApiEnv,
} from '@/lib/server/tradestation-config'
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
  Last?: string
  Bid?: string
  Ask?: string
  MarketValue?: string
  TotalCost?: string
  UnrealizedProfitLoss?: string
  UnrealizedProfitLossPercent?: string
  TodaysProfitLoss?: string
}

export interface TradeStationOrderLeg {
  Symbol: string
  BuyOrSell?: string
  OpenOrClose?: string
  ExecutionPrice?: string
  ExecQuantity?: string
  QuantityOrdered?: string
  QuantityRemaining?: string
  AssetType?: string
}

export interface TradeStationOrder {
  OrderID: string
  AccountID?: string
  OpenedDateTime?: string
  ClosedDateTime?: string
  Status?: string
  StatusDescription?: string
  RejectReason?: string
  Messages?: Array<string | { Message?: string; Description?: string }>
  FilledPrice?: string
  PriceUsedForBuyingPower?: string
  /** Equity-style side when present: Buy, Sell, SellShort, BuyToCover, … */
  Side?: string
  TradeAction?: string
  Symbol?: string
  Quantity?: string
  Legs?: TradeStationOrderLeg[]
}

export interface TradeStationOptionExpiration {
  Date: string
  Type?: string
}

export interface TradeStationOptionChainLeg {
  Symbol: string
  Ratio?: number
  StrikePrice?: string | number
  Expiration?: string
  OptionType?: string
  AssetType?: string
}

export interface TradeStationOptionChainRow {
  Delta?: string | number
  DailyOpenInterest?: number
  OpenInterest?: number
  Ask?: string | number
  Bid?: string | number
  Mid?: string | number
  Last?: string | number
  Close?: string | number
  PreviousClose?: string | number
  Volume?: number
  Side?: string
  /** Flat stream schema (v3 asyncapi) */
  Symbol?: string
  Underlying?: string
  StrikePrice?: string | number
  ExpirationDate?: string
  OptionType?: string
  Strikes?: string[]
  Legs?: TradeStationOptionChainLeg[]
  Heartbeat?: boolean | number
  Error?: string
  Message?: string
}

export interface OptionChainSnapshotResult {
  rows: TradeStationOptionChainRow[]
  httpStatus: number
  rawBytes: number
  heartbeatCount: number
  parseErrors: number
  streamErrors: string[]
  sampleKeys: string[]
}


export interface TradeStationQuote {
  Symbol: string
  Last?: string | number
  Ask?: string | number
  Bid?: string | number
  Close?: string | number
  PreviousClose?: string | number
  Open?: string | number
  High?: string | number
  Low?: string | number
  NetChange?: string | number
  NetChangePct?: string | number
  Volume?: string | number
}

export interface TradeStationOrderRequest {
  AccountID: string
  Symbol: string
  Quantity: string
  OrderType: 'Market' | 'Limit' | 'StopMarket' | 'StopLimit'
  TradeAction:
    | 'BUY'
    | 'SELL'
    | 'BUYTOCOVER'
    | 'SELLSHORT'
    | 'BUYTOOPEN'
    | 'BUYTOCLOSE'
    | 'SELLTOOPEN'
    | 'SELLTOCLOSE'
  TimeInForce: { Duration: string; Expiration?: string }
  Route?: string
  LimitPrice?: string
  /** Required on many Reg-T margin / paper accounts or TS rejects with a bare REJ. */
  BuyingPowerWarning?: 'Enforce' | 'Preconfirmed' | 'Confirmed'
}

export interface TradeStationPlaceOrderResult {
  Orders?: Array<{ OrderID?: string; Message?: string; Error?: string }>
  Errors?: Array<{ Error?: string; Message?: string }>
}

async function tradeStationFetch<T>(
  accessToken: string,
  path: string,
  options?: {
    method?: string
    body?: unknown
    apiEnv?: TradeStationApiEnv
  }
): Promise<T> {
  const apiBase = tradeStationApiBase(options?.apiEnv ?? 'live')
  const response = await fetch(`${apiBase}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
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

export async function fetchTradeStationAccounts(
  accessToken: string,
  apiEnv: TradeStationApiEnv = 'live'
): Promise<TradeStationAccount[]> {
  const data = await tradeStationFetch<{ Accounts?: TradeStationAccount[] }>(
    accessToken,
    '/brokerage/accounts',
    { apiEnv }
  )
  return data.Accounts ?? []
}

export type TradeStationBalance = {
  AccountID?: string
  AccountType?: string
  BuyingPower?: string
  CashBalance?: string
  Equity?: string
  MarketValue?: string
  TodaysProfitLoss?: string
  BalanceDetail?: {
    OvernightBuyingPower?: string
    DayTrades?: string
    RequiredMargin?: string
    UnrealizedProfitLoss?: string
  }
}

export async function fetchTradeStationBalances(
  accessToken: string,
  accountIds: string[],
  apiEnv: TradeStationApiEnv = 'sim'
): Promise<TradeStationBalance[]> {
  if (accountIds.length === 0) return []
  const data = await tradeStationFetch<{ Balances?: TradeStationBalance[] }>(
    accessToken,
    `/brokerage/accounts/${accountIds.join(',')}/balances`,
    { apiEnv }
  )
  return data.Balances ?? []
}

export async function fetchTradeStationPositions(
  accessToken: string,
  accountIds: string[],
  apiEnv: TradeStationApiEnv = 'live'
): Promise<TradeStationPosition[]> {
  if (accountIds.length === 0) return []
  const data = await tradeStationFetch<{ Positions?: TradeStationPosition[] }>(
    accessToken,
    `/brokerage/accounts/${accountIds.join(',')}/positions`,
    { apiEnv }
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
  since: string,
  apiEnv: TradeStationApiEnv = 'live'
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
    }>(
      accessToken,
      `/brokerage/accounts/${accountIds.join(',')}/historicalorders?${params}`,
      { apiEnv }
    )

    orders.push(...(data.Orders ?? []))
    nextToken = data.NextToken
  } while (nextToken)

  return orders
}

/** Today's and still-open orders (not in historical until closed/moved). */
export async function fetchTradeStationCurrentOrders(
  accessToken: string,
  accountIds: string[],
  apiEnv: TradeStationApiEnv = 'live'
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
    }>(accessToken, path, { apiEnv })

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

export async function fetchQuoteSnapshots(
  accessToken: string,
  symbols: string[]
): Promise<TradeStationQuote[]> {
  if (symbols.length === 0) return []
  const data = await tradeStationFetch<{ Quotes?: TradeStationQuote[] }>(
    accessToken,
    `/marketdata/quotes/${symbols.map(encodeURIComponent).join(',')}`
  )
  return data.Quotes ?? []
}

export async function fetchOptionExpirations(
  accessToken: string,
  underlying: string
): Promise<TradeStationOptionExpiration[]> {
  const data = await tradeStationFetch<{ Expirations?: TradeStationOptionExpiration[] }>(
    accessToken,
    `/marketdata/options/expirations/${encodeURIComponent(underlying)}`
  )
  return data.Expirations ?? []
}

export async function fetchOptionStrikes(
  accessToken: string,
  underlying: string,
  expiration?: string
): Promise<number[]> {
  const params = new URLSearchParams()
  if (expiration) params.set('expiration', expiration)
  const query = params.toString()
  const path = `/marketdata/options/strikes/${encodeURIComponent(underlying)}${query ? `?${query}` : ''}`
  const data = await tradeStationFetch<{ Strikes?: Array<number | string | number[]> }>(
    accessToken,
    path
  )
  const raw = data.Strikes ?? []
  const out: number[] = []
  for (const item of raw) {
    if (Array.isArray(item)) {
      for (const nested of item) {
        const n = typeof nested === 'number' ? nested : Number(nested)
        if (Number.isFinite(n)) out.push(n)
      }
    } else {
      const n = typeof item === 'number' ? item : Number(item)
      if (Number.isFinite(n)) out.push(n)
    }
  }
  return out
}

/** TradeStation OSI-style option symbol, e.g. `AMZN 240816C185` or `BA 240816P175.5`. */
export function buildTradeStationOptionSymbol(
  underlying: string,
  expirationYmd: string,
  optionType: 'Call' | 'Put',
  strike: number
): string {
  const [y, m, d] = expirationYmd.split('-')
  const yymmdd = `${y.slice(2)}${m}${d}`
  const cp = optionType === 'Call' ? 'C' : 'P'
  const strikeText = Number.isInteger(strike) ? String(strike) : String(strike)
  return `${underlying.toUpperCase()} ${yymmdd}${cp}${strikeText}`
}

/**
 * Collect a one-shot option-chain snapshot from TradeStation's chunked stream.
 * Handles both Legs[] spread payloads and flat Symbol/StrikePrice rows.
 */
export async function collectOptionChainSnapshot(
  accessToken: string,
  underlying: string,
  query: {
    expiration?: string
    optionType: 'Call' | 'Put' | 'All'
    strikeRange?: 'OTM' | 'ITM' | 'All'
    strikeProximity?: number
    enableGreeks?: boolean
  },
  options?: { timeoutMs?: number; apiEnv?: TradeStationApiEnv }
): Promise<TradeStationOptionChainRow[]> {
  const result = await collectOptionChainSnapshotDetailed(accessToken, underlying, query, options)
  return result.rows
}

export async function collectOptionChainSnapshotDetailed(
  accessToken: string,
  underlying: string,
  query: {
    expiration?: string
    optionType: 'Call' | 'Put' | 'All'
    strikeRange?: 'OTM' | 'ITM' | 'All'
    strikeProximity?: number
    enableGreeks?: boolean
  },
  options?: { timeoutMs?: number; apiEnv?: TradeStationApiEnv }
): Promise<OptionChainSnapshotResult> {
  const params = new URLSearchParams({
    spreadType: 'Single',
    optionType: query.optionType,
    strikeRange: query.strikeRange ?? 'All',
    strikeProximity: String(query.strikeProximity ?? 12),
    enableGreeks: String(query.enableGreeks ?? false),
  })
  if (query.expiration) params.set('expiration', query.expiration)

  const apiBase = tradeStationApiBase(options?.apiEnv ?? 'live')
  const url = `${apiBase}/marketdata/stream/options/chains/${encodeURIComponent(underlying)}?${params}`
  const timeoutMs = options?.timeoutMs ?? 12_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const rows: TradeStationOptionChainRow[] = []
  const streamErrors: string[] = []
  let heartbeatCount = 0
  let parseErrors = 0
  let rawBytes = 0
  let httpStatus = 0
  let sampleKeys: string[] = []

  const ingestObject = (parsed: TradeStationOptionChainRow) => {
    if (parsed.Heartbeat != null) {
      heartbeatCount += 1
      return
    }
    if (parsed.Error || parsed.Message) {
      streamErrors.push(String(parsed.Error || parsed.Message))
    }
    const normalized = normalizeOptionChainRow(parsed)
    if (!normalized) return
    if (sampleKeys.length === 0) sampleKeys = Object.keys(parsed).slice(0, 12)
    rows.push(normalized)
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.tradestation.streams.v2+json, application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    })
    httpStatus = response.status

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '')
      throw new Error(text || `Option chain stream failed (${response.status})`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      rawBytes += value?.byteLength ?? 0
      buffer += decoder.decode(value, { stream: true })

      // Prefer newline-delimited JSON; also extract complete {...} objects.
      let progress = true
      while (progress) {
        progress = false
        const newline = buffer.indexOf('\n')
        if (newline >= 0) {
          const line = buffer.slice(0, newline).trim()
          buffer = buffer.slice(newline + 1)
          progress = true
          if (!line || /^\d+$/.test(line)) continue // skip chunk-size lines
          try {
            ingestObject(JSON.parse(line) as TradeStationOptionChainRow)
          } catch {
            parseErrors += 1
          }
          if (rows.length > 0 && heartbeatCount > 0) {
            controller.abort()
            return {
              rows,
              httpStatus,
              rawBytes,
              heartbeatCount,
              parseErrors,
              streamErrors,
              sampleKeys,
            }
          }
          continue
        }

        const start = buffer.indexOf('{')
        if (start < 0) {
          buffer = ''
          break
        }
        if (start > 0) buffer = buffer.slice(start)
        let depth = 0
        let end = -1
        let inString = false
        let escape = false
        for (let i = 0; i < buffer.length; i++) {
          const ch = buffer[i]
          if (inString) {
            if (escape) escape = false
            else if (ch === '\\') escape = true
            else if (ch === '"') inString = false
            continue
          }
          if (ch === '"') inString = true
          else if (ch === '{') depth += 1
          else if (ch === '}') {
            depth -= 1
            if (depth === 0) {
              end = i
              break
            }
          }
        }
        if (end < 0) break
        const jsonText = buffer.slice(0, end + 1)
        buffer = buffer.slice(end + 1)
        progress = true
        try {
          ingestObject(JSON.parse(jsonText) as TradeStationOptionChainRow)
        } catch {
          parseErrors += 1
        }
        if (rows.length >= 40) {
          controller.abort()
          break
        }
      }
    }

    return {
      rows,
      httpStatus,
      rawBytes,
      heartbeatCount,
      parseErrors,
      streamErrors,
      sampleKeys,
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      return {
        rows,
        httpStatus,
        rawBytes,
        heartbeatCount,
        parseErrors,
        streamErrors,
        sampleKeys,
      }
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/** Normalize flat or Legs[] stream payloads into a Legs[]-shaped row. */
function normalizeOptionChainRow(
  parsed: TradeStationOptionChainRow
): TradeStationOptionChainRow | null {
  if (parsed.Legs?.length) {
    return {
      ...parsed,
      DailyOpenInterest:
        toNumLocal(parsed.DailyOpenInterest) ?? toNumLocal(parsed.OpenInterest) ?? parsed.DailyOpenInterest,
    }
  }

  const symbol = parsed.Symbol
  const strike = toNumLocal(parsed.StrikePrice ?? parsed.Strikes?.[0])
  const expiration = parsed.ExpirationDate || parsed.Legs?.[0]?.Expiration
  const optionType = parsed.OptionType || parsed.Side
  if (!symbol || strike == null) {
    // Still keep rows that only have Side/Ask (legacy) if we can read Strikes
    if (parsed.Side && parsed.Strikes?.[0]) {
      const s = toNumLocal(parsed.Strikes[0])
      if (s == null) return null
      return {
        ...parsed,
        DailyOpenInterest:
          toNumLocal(parsed.DailyOpenInterest) ?? toNumLocal(parsed.OpenInterest) ?? 0,
        Legs: [
          {
            Symbol: `${parsed.Underlying || 'UNK'} ${parsed.Strikes[0]}${parsed.Side?.[0] || ''}`,
            StrikePrice: s,
            Expiration: expiration,
            OptionType: parsed.Side,
            AssetType: 'StockOption',
            Ratio: 1,
          },
        ],
      }
    }
    return null
  }

  return {
    ...parsed,
    Side: parsed.Side || optionType,
    DailyOpenInterest:
      toNumLocal(parsed.DailyOpenInterest) ?? toNumLocal(parsed.OpenInterest) ?? 0,
    Legs: [
      {
        Symbol: symbol,
        StrikePrice: strike,
        Expiration: expiration,
        OptionType: optionType,
        AssetType: 'StockOption',
        Ratio: 1,
      },
    ],
  }
}

function toNumLocal(value: string | number | undefined | null): number | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

export async function placeTradeStationOrder(
  accessToken: string,
  order: TradeStationOrderRequest,
  apiEnv: TradeStationApiEnv = 'sim'
): Promise<TradeStationPlaceOrderResult> {
  return tradeStationFetch<TradeStationPlaceOrderResult>(
    accessToken,
    '/orderexecution/orders',
    { method: 'POST', body: order, apiEnv }
  )
}

export async function confirmTradeStationOrder(
  accessToken: string,
  order: TradeStationOrderRequest,
  apiEnv: TradeStationApiEnv = 'sim'
): Promise<{ Confirmations?: Array<{ SummaryMessage?: string; EstimatedCost?: string }> }> {
  return tradeStationFetch(accessToken, '/orderexecution/orderconfirm', {
    method: 'POST',
    body: order,
    apiEnv,
  })
}
