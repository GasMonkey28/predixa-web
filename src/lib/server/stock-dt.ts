import axios from 'axios'

import {
  STOCK_DT_RECLAIM_MIN_WIN_PCT,
  STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT,
  STOCK_DT_SCORE_LINE,
  STOCK_DT_SIDE_BUDGET,
  isReclaimBuySource,
  parseStockDtBuySource,
  type StockDtBuySource,
  type StockDtCandidate,
  type StockDtPlanResponse,
  type StockDtSide,
  type StockDtSidePlan,
} from '@/lib/stock-dt'
import {
  dayMoveFromQuote,
  sessionOpenFromQuote,
  type DtMarketQuotes,
  type DtTickerQuote,
} from '@/lib/dt-quotes'
import {
  buildLiveLongCloseRows,
  lookupReclaimWinRate,
  type ReclaimCloseFeederRow,
} from '@/lib/reclaim-close'
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
      const quote = quotesBySymbol.get(row.ticker.toUpperCase())
      const move = dayMoveFromQuote(quote)
      const vsOpen = sessionOpenFromQuote(quote)
      return {
        ticker: row.ticker,
        side,
        score: row.score ?? 0,
        last: move.last,
        previousClose: move.previousClose,
        open: vsOpen.open,
        netChange: move.netChange,
        netChangePct: move.netChangePct,
        fromOpen: vsOpen.fromOpen,
        fromOpenPct: vsOpen.fromOpenPct,
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
  reclaimExits?: Map<string, { long?: StockDtReclaimExits; short?: StockDtReclaimExits }>
}): StockDtSidePlan {
  const { side, rows, quotesBySymbol, sideBudget, minScore, source, reclaimExits } = input
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
    const vsOpen = sessionOpenFromQuote(item.quote)

    const reason =
      source === 'model_reclaim_close'
        ? `Close-entry · win ${item.score.toFixed(1)}% · weighted ${weightPct}% · target $${targetDollars.toFixed(0)}`
        : source === 'model_reclaim'
          ? `Win ${item.score.toFixed(1)}% · weighted ${weightPct}% · target $${targetDollars.toFixed(0)}`
          : `Score-weighted ${weightPct}% · target $${targetDollars.toFixed(0)}`

    const exits = reclaimExits?.get(item.row.ticker.toUpperCase())?.[side]
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
      open: vsOpen.open,
      netChange: move.netChange,
      netChangePct: move.netChangePct,
      fromOpen: vsOpen.fromOpen,
      fromOpenPct: vsOpen.fromOpenPct,
      price: item.price,
      weight,
      targetDollars,
      quantity,
      estimatedCost,
      reason,
      targetClose: exits?.targetClose ?? null,
      stopLoss: exits?.stopLoss ?? null,
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

type ReclaimSignal = {
  side?: string
  size?: number
  overshoot_pct?: number
  reclaim_price?: number
  flat_price?: number
  stop_price?: number | null
}
type ReclaimRow = {
  ticker?: string
  as_of_date?: string
  price_as_of?: string
  fallback?: boolean
  signals?: ReclaimSignal[]
  range?: {
    long_flat_price?: number
    short_flat_price?: number
    pred_high?: number
    pred_low?: number
    prev_close?: number
    min_overshoot?: number
    os_pct?: number
  }
  last?: number
  low?: number
  open?: number
  net_change_pct?: number
  context?: {
    long_tier?: string
    y2y3_hands?: number
  }
}
type WinRatesPayload = {
  tickers?: Record<string, { long?: { win_rate_pct?: number }; short?: { win_rate_pct?: number } }>
}

/** Model Reclaim target flat / stop for an open position or candidate. */
export type StockDtReclaimExits = {
  targetClose: number | null
  stopLoss: number | null
}

function reclaimExitsFromFeeder(
  row: ReclaimRow,
  side: StockDtSide
): StockDtReclaimExits {
  const signal = (row.signals || []).find((s) => s.side === side)
  const rangeFlat =
    side === 'long'
      ? toNum(row.range?.long_flat_price) ?? toNum(row.range?.pred_low)
      : toNum(row.range?.short_flat_price) ?? toNum(row.range?.pred_high)
  const targetClose =
    toNum(signal?.reclaim_price) ?? toNum(signal?.flat_price) ?? rangeFlat ?? null
  const stopLoss =
    side === 'short' ? toNum(signal?.stop_price) ?? null : null
  return { targetClose, stopLoss }
}

/**
 * Load Model Reclaim target-close / stop levels for open symbols (best-effort).
 * Keyed by SYMBOL → { long?, short? }.
 */
export async function loadReclaimExitLevels(
  symbols: string[]
): Promise<Map<string, { long?: StockDtReclaimExits; short?: StockDtReclaimExits }>> {
  const unique = [
    ...new Set(
      symbols
        .map((s) => String(s || '').trim().toUpperCase())
        .filter(Boolean)
    ),
  ]
  const out = new Map<string, { long?: StockDtReclaimExits; short?: StockDtReclaimExits }>()
  if (unique.length === 0) return out

  await Promise.all(
    unique.map(async (ticker) => {
      try {
        const key = rangeReclaimLatestKey(ticker)
        const data = (await fetchS3Json(tickerBucket(ticker, BUCKET), key)) as ReclaimRow
        if (!data || data.fallback) return
        out.set(ticker, {
          long: reclaimExitsFromFeeder(data, 'long'),
          short: reclaimExitsFromFeeder(data, 'short'),
        })
      } catch {
        // Missing feeder is fine — UI shows —.
      }
    })
  )
  return out
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

type LoadedReclaimFeeders = {
  feeders: ReclaimRow[]
  winRates: WinRatesPayload | null
  reclaimExits: Map<string, { long?: StockDtReclaimExits; short?: StockDtReclaimExits }>
  asOf: string | null
  priceAsOf: string | null
  warnings: string[]
}

async function loadReclaimFeeders(): Promise<LoadedReclaimFeeders> {
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

  const feeders: ReclaimRow[] = []
  const reclaimExits = new Map<
    string,
    { long?: StockDtReclaimExits; short?: StockDtReclaimExits }
  >()
  const asOfCounts = new Map<string, number>()
  const priceAsOfCounts = new Map<string, number>()

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue
    const row = result.value
    if (row.fallback) continue
    const ticker = String(row.ticker || '').trim().toUpperCase()
    if (!ticker) continue
    feeders.push({ ...row, ticker })
    reclaimExits.set(ticker, {
      long: reclaimExitsFromFeeder(row, 'long'),
      short: reclaimExitsFromFeeder(row, 'short'),
    })
    if (row.as_of_date) {
      const d = String(row.as_of_date)
      asOfCounts.set(d, (asOfCounts.get(d) ?? 0) + 1)
    }
    if (row.price_as_of) {
      const d = String(row.price_as_of)
      priceAsOfCounts.set(d, (priceAsOfCounts.get(d) ?? 0) + 1)
    }
  }

  return {
    feeders,
    winRates,
    reclaimExits,
    asOf: [...asOfCounts.keys()].sort().at(-1) ?? null,
    priceAsOf: [...priceAsOfCounts.keys()].sort().at(-1) ?? null,
    warnings,
  }
}

function rankReclaimRows(rows: TickerRankRow[]): TickerRankRow[] {
  rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  rows.forEach((r, i) => {
    r.rank = i + 1
  })
  return rows
}

async function loadModelReclaimRows(minWinLong: number, minWinShort: number): Promise<{
  longRows: TickerRankRow[]
  shortRows: TickerRankRow[]
  asOf: string | null
  priceAsOf: string | null
  reclaimExits: Map<string, { long?: StockDtReclaimExits; short?: StockDtReclaimExits }>
  warnings: string[]
}> {
  const loaded = await loadReclaimFeeders()
  const longRows: TickerRankRow[] = []
  const shortRows: TickerRankRow[] = []

  for (const row of loaded.feeders) {
    if (!row.ticker) continue
    for (const signal of row.signals || []) {
      const side = signal.side === 'short' ? 'short' : signal.side === 'long' ? 'long' : null
      if (!side) continue
      const wr = lookupReclaimWinRate(loaded.winRates, row.ticker, side)?.win_rate_pct
      const floor = side === 'short' ? minWinShort : minWinLong
      if (wr == null || !Number.isFinite(wr) || wr < floor) continue

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

  rankReclaimRows(longRows)
  rankReclaimRows(shortRows)

  let asOf = loaded.asOf
  const candidateDates = [...longRows, ...shortRows]
    .map((r) => r.as_of)
    .filter((d): d is string => Boolean(d))
  if (candidateDates.length > 0) {
    asOf = candidateDates.reduce((best, d) => (d > best ? d : best))
  }

  const warnings = [...loaded.warnings]
  if (longRows.length === 0 && shortRows.length === 0) {
    warnings.push(
      `No Model Reclaim signals today with long win ≥ ${minWinLong}% / short win ≥ ${minWinShort}%. Adjust the floor or check /daily/reclaim.`
    )
  }

  return {
    longRows,
    shortRows,
    asOf,
    priceAsOf: loaded.priceAsOf,
    reclaimExits: loaded.reclaimExits,
    warnings,
  }
}

function attachLiveQuotesToFeeders(
  feeders: ReclaimRow[],
  quotesBySymbol: Map<string, TradeStationQuote>
): ReclaimCloseFeederRow[] {
  return feeders.map((row) => {
    const ticker = (row.ticker || '').toUpperCase()
    const quote = quotesBySymbol.get(ticker)
    const move = dayMoveFromQuote(quote)
    return {
      ...row,
      ticker,
      last: move.last,
      low: toNum(quote?.Low) ?? move.last,
      open: toNum(quote?.Open),
      net_change_pct: move.netChangePct,
    }
  })
}

function clampBudget(raw: number | undefined | null): number {
  if (raw == null || !Number.isFinite(raw)) return STOCK_DT_SIDE_BUDGET
  return Math.max(100, Math.min(1_000_000, Math.round(raw)))
}

function clampMinWinPct(
  raw: number | undefined | null,
  fallback: number = STOCK_DT_RECLAIM_MIN_WIN_PCT
): number {
  if (raw == null || !Number.isFinite(raw)) return fallback
  return Math.max(0, Math.min(100, raw))
}

async function fillQuotes(
  accessToken: string,
  tickers: string[],
  warnings: string[]
): Promise<Map<string, TradeStationQuote>> {
  const quotesBySymbol = new Map<string, TradeStationQuote>()
  const unique = Array.from(new Set(tickers.map((t) => t.toUpperCase()).filter(Boolean)))
  const chunkSize = 40
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    try {
      const quotes = await fetchQuoteSnapshots(accessToken, chunk)
      for (const q of quotes) {
        if (q.Symbol) quotesBySymbol.set(q.Symbol.toUpperCase(), q)
      }
    } catch (error) {
      warnings.push(
        `Quote fetch failed for ${chunk.slice(0, 3).join(',')}…: ${(error as Error).message}`
      )
    }
  }
  return quotesBySymbol
}

export async function buildStockDtPlan(input: {
  accessToken: string
  accountId?: string | null
  tradeScopesOk: boolean
  source?: StockDtBuySource | string | null
  sideBudget?: number | null
  minWinPct?: number | null
  minWinPctLong?: number | null
  minWinPctShort?: number | null
}): Promise<StockDtPlanResponse> {
  const source = parseStockDtBuySource(input.source)
  const sideBudget = clampBudget(input.sideBudget)
  const minWinLong = clampMinWinPct(
    input.minWinPctLong ?? input.minWinPct,
    STOCK_DT_RECLAIM_MIN_WIN_PCT
  )
  const minWinShort = clampMinWinPct(
    input.minWinPctShort ?? input.minWinPct,
    STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT
  )
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
  let reclaimExits:
    | Map<string, { long?: StockDtReclaimExits; short?: StockDtReclaimExits }>
    | undefined

  let minScoreLong = STOCK_DT_SCORE_LINE
  let minScoreShort = STOCK_DT_SCORE_LINE
  let quotesBySymbol = new Map<string, TradeStationQuote>()
  let liveCloseByTicker = new Map<
    string,
    { overshoot: number; overshootPct: number; low?: number }
  >()

  if (source === 'model_reclaim') {
    minScoreLong = minWinLong
    minScoreShort = minWinShort
    minScore = minWinLong
    const reclaim = await loadModelReclaimRows(minWinLong, minWinShort)
    longRows = reclaim.longRows
    shortRows = reclaim.shortRows
    asOf = reclaim.asOf
    priceAsOf = reclaim.priceAsOf
    reclaimExits = reclaim.reclaimExits
    warnings.push(...reclaim.warnings)
  } else if (source === 'model_reclaim_close') {
    minScoreLong = minWinLong
    minScoreShort = minWinShort
    minScore = minWinLong
    const loaded = await loadReclaimFeeders()
    asOf = loaded.asOf
    priceAsOf = loaded.priceAsOf
    reclaimExits = loaded.reclaimExits
    warnings.push(...loaded.warnings)
    quotesBySymbol = await fillQuotes(
      input.accessToken,
      loaded.feeders.map((row) => row.ticker || ''),
      warnings
    )
    const live = buildLiveLongCloseRows(
      attachLiveQuotesToFeeders(loaded.feeders, quotesBySymbol),
      loaded.winRates,
      minWinLong
    )
    liveCloseByTicker = new Map(
      live.map((row) => [
        row.ticker.toUpperCase(),
        {
          overshoot: row.overshoot,
          overshootPct: row.overshoot_pct,
          low: row.low,
        },
      ])
    )
    longRows = live.map((row) => ({
      rank: row.rank,
      ticker: row.ticker,
      score: row.win_rate_pct ?? 0,
      position_size: 1,
      signal: 'reclaim_close_long',
      as_of: row.as_of_date ? String(row.as_of_date) : null,
    }))
    shortRows = []
    if (quotesBySymbol.size === 0) {
      warnings.push(
        'No live quotes — connect TradeStation so Low/Last can detect pred_low breaches.'
      )
    } else if (longRows.length === 0) {
      warnings.push(
        `No live long pred_low breaches with win ≥ ${minWinLong}%. Same list as /daily/reclaim-close.`
      )
    }
  } else {
    const ranks = await buildTickerRanks()
    const summaryLong = ranks.boards.find((b) => b.id === 'summary_long')
    const summaryShort = ranks.boards.find((b) => b.id === 'summary_short')
    longRows = summaryLong?.rows ?? []
    shortRows = summaryShort?.rows ?? []
  }

  const longAbove = longRows.filter(
    (r) => (r.score ?? Number.NEGATIVE_INFINITY) >= minScoreLong
  )
  const shortAbove = shortRows.filter(
    (r) => (r.score ?? Number.NEGATIVE_INFINITY) >= minScoreShort
  )

  if (source !== 'model_reclaim_close') {
    quotesBySymbol = await fillQuotes(
      input.accessToken,
      [...longAbove, ...shortAbove].map((r) => r.ticker),
      warnings
    )
  }

  const long = allocateSide({
    side: 'long',
    rows: longRows,
    quotesBySymbol,
    sideBudget,
    minScore: minScoreLong,
    source,
    reclaimExits,
  })
  if (source === 'model_reclaim_close') {
    for (const c of long.candidates) {
      const live = liveCloseByTicker.get(c.ticker.toUpperCase())
      if (!live) continue
      c.overshoot = live.overshoot
      c.overshootPct = live.overshootPct
      c.dayLow = live.low
    }
    long.candidates.sort((a, b) => {
      const os = (b.overshootPct || 0) - (a.overshootPct || 0)
      if (os !== 0) return os
      return (b.summaryScore || 0) - (a.summaryScore || 0)
    })
  }
  const short = allocateSide({
    side: 'short',
    rows: shortRows,
    quotesBySymbol,
    sideBudget,
    minScore: minScoreShort,
    source,
    reclaimExits,
  })
  const market: DtMarketQuotes = {
    long: buildMarketSide('long', longRows, quotesBySymbol, minScoreLong),
    short: buildMarketSide('short', shortRows, quotesBySymbol, minScoreShort),
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
    price_as_of: isReclaimBuySource(source) ? priceAsOf : undefined,
    source,
    score_line: minScore,
    min_win_pct: isReclaimBuySource(source) ? minWinLong : undefined,
    min_win_pct_long: isReclaimBuySource(source) ? minWinLong : undefined,
    min_win_pct_short: source === 'model_reclaim' ? minWinShort : undefined,
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
