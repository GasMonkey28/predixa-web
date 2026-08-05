import {
  STOCK_DT_SCORE_LINE,
  STOCK_DT_SIDE_BUDGET,
  type StockDtCandidate,
  type StockDtPlanResponse,
  type StockDtSide,
  type StockDtSidePlan,
} from '@/lib/stock-dt'
import { dayMoveFromQuote, type DtMarketQuotes, type DtTickerQuote } from '@/lib/dt-quotes'
import { buildTickerRanks } from '@/lib/server/ticker-ranks'
import {
  fetchQuoteSnapshots,
  type TradeStationQuote,
} from '@/lib/server/tradestation-client'
import type { TickerRankRow } from '@/lib/ticker-ranks'

function toNum(value: string | number | undefined | null): number | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

function pickPrice(quote: TradeStationQuote | undefined, side: StockDtSide): number | undefined {
  if (!quote) return undefined
  const ask = toNum(quote.Ask)
  const bid = toNum(quote.Bid)
  const last = toNum(quote.Last) ?? toNum(quote.Close) ?? toNum(quote.PreviousClose)
  if (side === 'long') {
    if (ask != null && ask > 0) return ask
    if (last != null && last > 0) return last
    if (bid != null && bid > 0) return bid
  } else {
    if (bid != null && bid > 0) return bid
    if (last != null && last > 0) return last
    if (ask != null && ask > 0) return ask
  }
  return undefined
}

function buildMarketSide(
  side: StockDtSide,
  rows: TickerRankRow[],
  quotesBySymbol: Map<string, TradeStationQuote>
): DtTickerQuote[] {
  return rows
    .filter((r) => (r.score ?? Number.NEGATIVE_INFINITY) >= STOCK_DT_SCORE_LINE)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((row) => {
      const move = dayMoveFromQuote(quotesBySymbol.get(row.ticker.toUpperCase()))
      return {
        ticker: row.ticker,
        side,
        score: row.score ?? 0,
        last: move.last,
        previousClose: move.previousClose,
        netChange: move.netChange,
        netChangePct: move.netChangePct,
      }
    })
}

function allocateSide(input: {
  side: StockDtSide
  rows: TickerRankRow[]
  quotesBySymbol: Map<string, TradeStationQuote>
}): StockDtSidePlan {
  const { side, rows, quotesBySymbol } = input
  const above = rows
    .filter((r) => (r.score ?? Number.NEGATIVE_INFINITY) >= STOCK_DT_SCORE_LINE)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const skipped: StockDtSidePlan['skipped'] = []
  const priced: Array<{
    row: TickerRankRow
    quote: TradeStationQuote
    price: number
    score: number
  }> = []

  for (const row of above) {
    const score = row.score ?? 0
    const quote = quotesBySymbol.get(row.ticker.toUpperCase())
    const price = pickPrice(quote, side)
    if (!quote || price == null || price <= 0) {
      skipped.push({
        ticker: row.ticker,
        score,
        reason: 'No usable quote for sizing',
      })
      continue
    }
    priced.push({ row, quote, price, score })
  }

  const scoreSum = priced.reduce((sum, p) => sum + Math.max(p.score, 0), 0)
  const candidates: StockDtCandidate[] = []

  for (const item of priced) {
    const weight = scoreSum > 0 ? Math.max(item.score, 0) / scoreSum : 1 / priced.length
    const targetDollars = Math.round(STOCK_DT_SIDE_BUDGET * weight * 100) / 100
    let quantity = Math.floor(targetDollars / item.price)
    if (quantity < 1) quantity = 1
    quantity = Math.min(quantity, 10_000)

    const estimatedCost = Math.round(quantity * item.price * 100) / 100
    const weightPct = Math.round(weight * 1000) / 10
    const move = dayMoveFromQuote(item.quote)

    candidates.push({
      id: `${side}:${item.row.ticker}`,
      side,
      ticker: item.row.ticker,
      summaryScore: item.score,
      mixScore: item.row.mix_score,
      hands: item.row.position_size,
      signal: item.row.signal,
      last: move.last ?? toNum(item.quote.Last) ?? toNum(item.quote.Close),
      ask: toNum(item.quote.Ask),
      bid: toNum(item.quote.Bid),
      previousClose: move.previousClose,
      netChange: move.netChange,
      netChangePct: move.netChangePct,
      price: item.price,
      weight,
      targetDollars,
      quantity,
      estimatedCost,
      reason: `Score-weighted ${weightPct}% · target $${targetDollars.toFixed(0)}`,
    })
  }

  const spent = Math.round(candidates.reduce((s, c) => s + c.estimatedCost, 0) * 100) / 100

  return {
    side,
    budget: STOCK_DT_SIDE_BUDGET,
    spent,
    remaining: Math.round((STOCK_DT_SIDE_BUDGET - spent) * 100) / 100,
    candidates,
    skipped,
  }
}

export async function buildStockDtPlan(input: {
  accessToken: string
  accountId?: string | null
  tradeScopesOk: boolean
}): Promise<StockDtPlanResponse> {
  const ranks = await buildTickerRanks()
  const summaryLong = ranks.boards.find((b) => b.id === 'summary_long')
  const summaryShort = ranks.boards.find((b) => b.id === 'summary_short')
  const warnings: string[] = []

  if (!input.tradeScopesOk) {
    warnings.push(
      'TradeStation connection is missing MarketData/Trade scopes. Reconnect TradeStation from this page.'
    )
  }

  const longRows = summaryLong?.rows ?? []
  const shortRows = summaryShort?.rows ?? []
  const longAbove = longRows.filter(
    (r) => (r.score ?? Number.NEGATIVE_INFINITY) >= STOCK_DT_SCORE_LINE
  )
  const shortAbove = shortRows.filter(
    (r) => (r.score ?? Number.NEGATIVE_INFINITY) >= STOCK_DT_SCORE_LINE
  )

  const tickers = Array.from(
    new Set([...longAbove, ...shortAbove].map((r) => r.ticker.toUpperCase()))
  )

  const quotesBySymbol = new Map<string, TradeStationQuote>()
  const chunkSize = 40
  for (let i = 0; i < tickers.length; i += chunkSize) {
    const chunk = tickers.slice(i, i + chunkSize)
    try {
      const quotes = await fetchQuoteSnapshots(input.accessToken, chunk)
      for (const q of quotes) {
        if (q.Symbol) quotesBySymbol.set(q.Symbol.toUpperCase(), q)
      }
    } catch (error) {
      warnings.push(
        `Quote fetch failed for ${chunk.slice(0, 3).join(',')}…: ${(error as Error).message}`
      )
    }
  }

  const long = allocateSide({ side: 'long', rows: longRows, quotesBySymbol })
  const short = allocateSide({ side: 'short', rows: shortRows, quotesBySymbol })
  const market: DtMarketQuotes = {
    long: buildMarketSide('long', longRows, quotesBySymbol),
    short: buildMarketSide('short', shortRows, quotesBySymbol),
  }

  const asOf =
    longAbove[0]?.as_of ||
    shortAbove[0]?.as_of ||
    longRows[0]?.as_of ||
    shortRows[0]?.as_of ||
    null

  return {
    generated_at: new Date().toISOString(),
    ranks_as_of: asOf,
    score_line: STOCK_DT_SCORE_LINE,
    side_budget: STOCK_DT_SIDE_BUDGET,
    allocation: 'score_weighted',
    market,
    long,
    short,
    warnings: warnings.length ? warnings : undefined,
    trade_scopes_ok: input.tradeScopesOk,
    account_id: input.accountId ?? null,
  }
}

/** Equity/stock positions only (exclude options). */
export function isStockPosition(symbol: string, assetType?: string | null): boolean {
  const asset = (assetType || '').toLowerCase()
  if (asset.includes('option')) return false
  if (/\d{6}[CP]/i.test(symbol) || symbol.includes(' ')) return false
  if (asset.includes('stock') || asset.includes('equity') || asset === '') return true
  if (asset.includes('future') || asset.includes('crypto') || asset.includes('forex')) return false
  return !asset.includes('option')
}
