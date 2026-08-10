import axios from 'axios'

import {
  STOCK_DT_RECLAIM_MIN_WIN_PCT,
  STOCK_DT_SCORE_LINE,
  STOCK_DT_SIDE_BUDGET,
  type StockDtBuySource,
  type StockDtCandidate,
  type StockDtPlanResponse,
  type StockDtSide,
  type StockDtSidePlan,
} from '@/lib/stock-dt'
import { dayMoveFromQuote, type DtMarketQuotes, type DtTickerQuote } from '@/lib/dt-quotes'
import { config } from '@/lib/server/config'
import { buildTickerRanks } from '@/lib/server/ticker-ranks'
import {
  fetchQuoteSnapshots,
  type TradeStationQuote,
} from '@/lib/server/tradestation-client'
import type { TickerRankRow } from '@/lib/ticker-ranks'
import {
  EQUITY_TICKERS,
  rangeReclaimLatestKey,
  rangeReclaimWinRatesKey,
  tickerBucket,
} from '@/lib/tickers'

const BUCKET = config.marketData.bucket

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
  quotesBySymbol: Map<string, TradeStationQuote>,
  minScore: number
): DtTickerQuote[] {
  return rows
    .filter((r) => (r.score ?? Number.NEGATIVE_INFINITY) >= minScore)
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
  sideBudget: number
  minScore: number
  source: StockDtBuySource
}): StockDtSidePlan {
  const { side, rows, quotesBySymbol, sideBudget, minScore, source } = input
  const above = rows
    .filter((r) => (r.score ?? Number.NEGATIVE_INFINITY) >= minScore)
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
    const targetDollars = Math.round(sideBudget * weight * 100) / 100
    let quantity = Math.floor(targetDollars / item.price)
    if (quantity < 1) quantity = 1
    quantity = Math.min(quantity, 10_000)

    const estimatedCost = Math.round(quantity * item.price * 100) / 100
    const weightPct = Math.round(weight * 1000) / 10
    const move = dayMoveFromQuote(item.quote)

    const reason =
      source === 'model_reclaim'
        ? `Win ${item.score.toFixed(1)}% · weighted ${weightPct}% · target $${targetDollars.toFixed(0)}`
        : `Score-weighted ${weightPct}% · target $${targetDollars.toFixed(0)}`

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
      reason,
    })
  }

  const spent = Math.round(candidates.reduce((s, c) => s + c.estimatedCost, 0) * 100) / 100

  return {
    side,
    budget: sideBudget,
    spent,
    remaining: Math.round((sideBudget - spent) * 100) / 100,
    candidates,
    skipped,
  }
}

type ReclaimSignal = { side?: string; size?: number; overshoot_pct?: number }
type ReclaimRow = {
  ticker?: string
  as_of_date?: string
  price_as_of?: string
  fallback?: boolean
  signals?: ReclaimSignal[]
}
type WinRatesPayload = {
  tickers?: Record<string, { long?: { win_rate_pct?: number }; short?: { win_rate_pct?: number } }>
}

async function fetchS3Json(bucket: string, key: string): Promise<unknown> {
  const urls = [
    `https://s3.amazonaws.com/${bucket}/${key}`,
    `https://${bucket}.s3.amazonaws.com/${key}`,
  ]
  let lastErr: unknown = null
  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        timeout: 10_000,
      })
      return response.data
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

async function loadModelReclaimRows(minWinPct: number): Promise<{
  longRows: TickerRankRow[]
  shortRows: TickerRankRow[]
  asOf: string | null
  priceAsOf: string | null
  warnings: string[]
}> {
  const warnings: string[] = []
  const tickers = ['SPY', ...EQUITY_TICKERS]
  const [settled, winRatesSettled] = await Promise.all([
    Promise.allSettled(
      tickers.map(async (t) => {
        const key = rangeReclaimLatestKey(t)
        const data = (await fetchS3Json(tickerBucket(t, BUCKET), key)) as ReclaimRow
        return { ticker: t, ...data }
      })
    ),
    fetchS3Json(BUCKET, rangeReclaimWinRatesKey())
      .then((d) => d as WinRatesPayload)
      .catch(() => null),
  ])

  const winRates = winRatesSettled
  if (!winRates?.tickers) {
    warnings.push('Model Reclaim win rates unavailable — no candidates can pass the win-rate filter.')
  }

  const longRows: TickerRankRow[] = []
  const shortRows: TickerRankRow[] = []
  const asOfCounts = new Map<string, number>()
  const priceAsOfCounts = new Map<string, number>()

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]
    if (result.status !== 'fulfilled') continue
    const row = result.value
    if (!row.ticker || row.fallback) continue
    if (row.as_of_date) {
      const d = String(row.as_of_date)
      asOfCounts.set(d, (asOfCounts.get(d) ?? 0) + 1)
    }
    if (row.price_as_of) {
      const d = String(row.price_as_of)
      priceAsOfCounts.set(d, (priceAsOfCounts.get(d) ?? 0) + 1)
    }

    for (const signal of row.signals || []) {
      const side = signal.side === 'short' ? 'short' : signal.side === 'long' ? 'long' : null
      if (!side) continue
      const wr = winRates?.tickers?.[row.ticker]?.[side]?.win_rate_pct
      if (wr == null || !Number.isFinite(wr) || wr < minWinPct) continue

      const ranked: TickerRankRow = {
        rank: 0,
        ticker: row.ticker,
        score: wr,
        position_size: signal.size,
        signal: `reclaim_${side}`,
        as_of: row.as_of_date ? String(row.as_of_date) : null,
      }
      if (side === 'long') longRows.push(ranked)
      else shortRows.push(ranked)
    }
  }

  // Prefer newest feeder date (YYYY-MM-DD sorts lexicographically).
  let asOf: string | null =
    [...asOfCounts.keys()].sort().at(-1) ?? null
  // If tradeable candidates exist, prefer the newest candidate as_of.
  const candidateDates = [...longRows, ...shortRows]
    .map((r) => r.as_of)
    .filter((d): d is string => Boolean(d))
  if (candidateDates.length > 0) {
    asOf = candidateDates.reduce((best, d) => (d > best ? d : best))
  }
  const priceAsOf: string | null =
    [...priceAsOfCounts.keys()].sort().at(-1) ?? null

  longRows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  shortRows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  longRows.forEach((r, i) => {
    r.rank = i + 1
  })
  shortRows.forEach((r, i) => {
    r.rank = i + 1
  })

  if (longRows.length === 0 && shortRows.length === 0) {
    warnings.push(
      `No Model Reclaim signals today with win rate ≥ ${minWinPct}%. Adjust the floor or check /daily/reclaim.`
    )
  }

  return { longRows, shortRows, asOf, priceAsOf, warnings }
}

function clampBudget(raw: number | undefined | null): number {
  if (raw == null || !Number.isFinite(raw)) return STOCK_DT_SIDE_BUDGET
  return Math.max(100, Math.min(1_000_000, Math.round(raw)))
}

function clampMinWinPct(raw: number | undefined | null): number {
  if (raw == null || !Number.isFinite(raw)) return STOCK_DT_RECLAIM_MIN_WIN_PCT
  return Math.max(0, Math.min(100, raw))
}

export async function buildStockDtPlan(input: {
  accessToken: string
  accountId?: string | null
  tradeScopesOk: boolean
  source?: StockDtBuySource | null
  sideBudget?: number | null
  minWinPct?: number | null
}): Promise<StockDtPlanResponse> {
  const source: StockDtBuySource =
    input.source === 'ticker_ranks' ? 'ticker_ranks' : 'model_reclaim'
  const sideBudget = clampBudget(input.sideBudget)
  const minWinPct = clampMinWinPct(input.minWinPct)
  const warnings: string[] = []

  if (!input.tradeScopesOk) {
    warnings.push(
      'TradeStation connection is missing MarketData/Trade scopes. Reconnect TradeStation from this page.'
    )
  }

  let longRows: TickerRankRow[] = []
  let shortRows: TickerRankRow[] = []
  let minScore = STOCK_DT_SCORE_LINE
  let asOf: string | null = null
  let priceAsOf: string | null = null

  if (source === 'model_reclaim') {
    minScore = minWinPct
    const reclaim = await loadModelReclaimRows(minWinPct)
    longRows = reclaim.longRows
    shortRows = reclaim.shortRows
    asOf = reclaim.asOf
    priceAsOf = reclaim.priceAsOf
    warnings.push(...reclaim.warnings)
  } else {
    const ranks = await buildTickerRanks()
    const summaryLong = ranks.boards.find((b) => b.id === 'summary_long')
    const summaryShort = ranks.boards.find((b) => b.id === 'summary_short')
    longRows = summaryLong?.rows ?? []
    shortRows = summaryShort?.rows ?? []
  }

  const longAbove = longRows.filter(
    (r) => (r.score ?? Number.NEGATIVE_INFINITY) >= minScore
  )
  const shortAbove = shortRows.filter(
    (r) => (r.score ?? Number.NEGATIVE_INFINITY) >= minScore
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

  const long = allocateSide({
    side: 'long',
    rows: longRows,
    quotesBySymbol,
    sideBudget,
    minScore,
    source,
  })
  const short = allocateSide({
    side: 'short',
    rows: shortRows,
    quotesBySymbol,
    sideBudget,
    minScore,
    source,
  })
  const market: DtMarketQuotes = {
    long: buildMarketSide('long', longRows, quotesBySymbol, minScore),
    short: buildMarketSide('short', shortRows, quotesBySymbol, minScore),
  }

  if (source === 'ticker_ranks') {
    asOf =
      longAbove[0]?.as_of ||
      shortAbove[0]?.as_of ||
      longRows[0]?.as_of ||
      shortRows[0]?.as_of ||
      null
  }

  return {
    generated_at: new Date().toISOString(),
    ranks_as_of: asOf,
    price_as_of: source === 'model_reclaim' ? priceAsOf : undefined,
    source,
    score_line: minScore,
    min_win_pct: source === 'model_reclaim' ? minWinPct : undefined,
    side_budget: sideBudget,
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
