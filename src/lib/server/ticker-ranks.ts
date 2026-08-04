import axios from 'axios'

import { config } from '@/lib/server/config'
import { etDateString, fetchLatestSummary } from '@/lib/server/summary-json'
import { logger } from '@/lib/server/logger'
import { EQUITY_TICKERS, model2ChartKey, tickerBucket } from '@/lib/tickers'
import {
  compareMix3Composite,
  compareY2y3Long,
  compareY2y3Short,
  mix3CompositeScore,
  shortMarketContext,
  shortRisk,
  summaryLongHandsBonus,
  summaryShortHandsBonus,
  tierDiff,
  type TickerRankBoard,
  type TickerRanksResponse,
  withRanks,
} from '@/lib/ticker-ranks'

const BUCKET = config.marketData.bucket

interface Mix3Snap {
  ticker: string
  as_of: string
  long_tier: string
  short_tier: string
  long_score: number
  short_score: number
  market_context?: string
  risk?: string
  confidence?: string
}

interface Y2y3Snap {
  ticker: string
  as_of: string | null
  final_signal: string
  position_size: number
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function str(v: unknown, fallback = 'N/A'): string {
  if (typeof v === 'string' && v.trim()) return v.trim()
  return fallback
}

async function fetchMix3(ticker: string): Promise<Mix3Snap> {
  const today = etDateString(0)
  const { date, data } = await fetchLatestSummary(BUCKET, today, ticker)
  const explanation =
    typeof data.compensation_explanation === 'string'
      ? data.compensation_explanation
      : typeof data.compensationExplanation === 'string'
        ? data.compensationExplanation
        : ''
  const summary = typeof data.summary === 'string' ? data.summary : ''
  const riskRaw =
    typeof data.risk === 'string'
      ? data.risk
      : typeof data.RISK === 'string'
        ? data.RISK
        : ''
  const confidenceRaw =
    typeof data.confidence === 'string'
      ? data.confidence
      : typeof data.CONFIDENCE === 'string'
        ? data.CONFIDENCE
        : ''

  return {
    ticker,
    as_of: date,
    long_tier: str(data.long_signal ?? data.long_tier ?? data.longTier),
    short_tier: str(data.short_signal ?? data.short_tier ?? data.shortTier),
    long_score: num(data.long_score ?? data.longScore),
    short_score: num(data.short_score ?? data.shortScore),
    market_context: shortMarketContext(explanation, summary),
    risk: shortRisk(riskRaw),
    confidence: confidenceRaw.trim() || undefined,
  }
}

async function fetchY2y3(ticker: string): Promise<Y2y3Snap> {
  const dataBucket = tickerBucket(ticker, BUCKET)
  const key = model2ChartKey(ticker)
  const url = `https://${dataBucket}.s3.amazonaws.com/${key}`
  const { data } = await axios.get(url, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    timeout: 12_000,
  })

  let today = data?.today
  if (!today && Array.isArray(data?.trading_days) && data.trading_days.length > 0) {
    const last = data.trading_days[data.trading_days.length - 1]
    today = {
      date: last.as_of_date || last.date,
      final_signal: last.final_signal,
      position_size: last.position_size,
    }
  }

  return {
    ticker,
    as_of: today?.date ? String(today.date) : null,
    final_signal: str(today?.final_signal, 'no_trade'),
    position_size: num(today?.position_size),
  }
}

export async function buildTickerRanks(): Promise<TickerRanksResponse> {
  const errors: TickerRanksResponse['errors'] = []
  const mix3: Mix3Snap[] = []
  const y2y3: Y2y3Snap[] = []

  await Promise.all(
    EQUITY_TICKERS.map(async (ticker) => {
      const [tiersRes, modelRes] = await Promise.allSettled([
        fetchMix3(ticker),
        fetchY2y3(ticker),
      ])

      if (tiersRes.status === 'fulfilled') {
        mix3.push(tiersRes.value)
      } else {
        const message =
          tiersRes.reason instanceof Error ? tiersRes.reason.message : String(tiersRes.reason)
        errors.push({ ticker, source: 'tiers', error: message })
        logger.warn({ ticker, error: message }, 'ticker ranks: tiers fetch failed')
        mix3.push({
          ticker,
          as_of: '',
          long_tier: 'N/A',
          short_tier: 'N/A',
          long_score: Number.NEGATIVE_INFINITY,
          short_score: Number.NEGATIVE_INFINITY,
        })
      }

      if (modelRes.status === 'fulfilled') {
        y2y3.push(modelRes.value)
      } else {
        const message =
          modelRes.reason instanceof Error ? modelRes.reason.message : String(modelRes.reason)
        errors.push({ ticker, source: 'y2y3', error: message })
        logger.warn({ ticker, error: message }, 'ticker ranks: y2y3 fetch failed')
        y2y3.push({
          ticker,
          as_of: null,
          final_signal: 'no_trade',
          position_size: 0,
        })
      }
    })
  )

  const y2y3ByTicker = new Map(y2y3.map((y) => [y.ticker, y]))

  const longMixRows = [...mix3]
    .map((item) => {
      const diff = tierDiff(item.long_tier, item.short_tier)
      const score = mix3CompositeScore({
        primaryTier: item.long_tier,
        opposingTier: item.short_tier,
        risk: item.risk,
        confidence: item.confidence,
      })
      return { item, diff, score }
    })
    .sort((a, b) =>
      compareMix3Composite(
        { ticker: a.item.ticker, score: a.score },
        { ticker: b.item.ticker, score: b.score }
      )
    )

  const shortMixRows = [...mix3]
    .map((item) => {
      const diff = tierDiff(item.short_tier, item.long_tier)
      const score = mix3CompositeScore({
        primaryTier: item.short_tier,
        opposingTier: item.long_tier,
        risk: item.risk,
        confidence: item.confidence,
      })
      return { item, diff, score }
    })
    .sort((a, b) =>
      compareMix3Composite(
        { ticker: a.item.ticker, score: a.score },
        { ticker: b.item.ticker, score: b.score }
      )
    )

  const longMixScoreByTicker = new Map(
    longMixRows.map((r) => [r.item.ticker, r.score] as const)
  )
  const shortMixScoreByTicker = new Map(
    shortMixRows.map((r) => [r.item.ticker, r.score] as const)
  )

  const summaryLongBoard: TickerRankBoard = {
    id: 'summary_long',
    title: 'Summary long',
    description:
      'Score = Rank 1 score + Rank 3 hands (+2 bonus if hands are +5 or +7). Higher total first.',
    rows: withRanks(
      EQUITY_TICKERS.map((ticker) => {
        const mixScore = longMixScoreByTicker.get(ticker) ?? Number.NEGATIVE_INFINITY
        const hands = y2y3ByTicker.get(ticker)?.position_size ?? 0
        const signal = y2y3ByTicker.get(ticker)?.final_signal
        const bonus = summaryLongHandsBonus(hands)
        const score = Number.isFinite(mixScore)
          ? mixScore + hands + bonus
          : Number.NEGATIVE_INFINITY
        return { ticker, mixScore, hands, signal, score }
      }).sort((a, b) =>
        compareMix3Composite(
          { ticker: a.ticker, score: a.score },
          { ticker: b.ticker, score: b.score }
        )
      ),
      (item, rank) => ({
        rank,
        ticker: item.ticker,
        mix_score: Number.isFinite(item.mixScore) ? item.mixScore : undefined,
        position_size: item.hands,
        signal: item.signal,
        score: Number.isFinite(item.score) ? item.score : undefined,
      })
    ),
  }

  const summaryShortBoard: TickerRankBoard = {
    id: 'summary_short',
    title: 'Summary short',
    description:
      'Score = Rank 2 score − Rank 4 hands (+2 bonus if hands are −5 or −7). Higher total first.',
    rows: withRanks(
      EQUITY_TICKERS.map((ticker) => {
        const mixScore = shortMixScoreByTicker.get(ticker) ?? Number.NEGATIVE_INFINITY
        const hands = y2y3ByTicker.get(ticker)?.position_size ?? 0
        const signal = y2y3ByTicker.get(ticker)?.final_signal
        const bonus = summaryShortHandsBonus(hands)
        const score = Number.isFinite(mixScore)
          ? mixScore - hands + bonus
          : Number.NEGATIVE_INFINITY
        return { ticker, mixScore, hands, signal, score }
      }).sort((a, b) =>
        compareMix3Composite(
          { ticker: a.ticker, score: a.score },
          { ticker: b.ticker, score: b.score }
        )
      ),
      (item, rank) => ({
        rank,
        ticker: item.ticker,
        mix_score: Number.isFinite(item.mixScore) ? item.mixScore : undefined,
        position_size: item.hands,
        signal: item.signal,
        score: Number.isFinite(item.score) ? item.score : undefined,
      })
    ),
  }

  const boards: TickerRankBoard[] = [
    summaryLongBoard,
    summaryShortBoard,
    {
      id: 'mix3_long',
      title: 'Rank 1 · 3mix long',
      description:
        'Score = long tier (SSS=9…D=0) + diff (long−short) + risk (L+2 / M0 / H−3) + conf (VH+2 … VL−2). Higher score ranks first.',
      rows: withRanks(longMixRows, ({ item, diff, score }, rank) => ({
        rank,
        ticker: item.ticker,
        tier: item.long_tier,
        other_tier: item.short_tier,
        tier_diff: diff,
        score: Number.isFinite(score) ? score : undefined,
        raw_score: Number.isFinite(item.long_score) ? item.long_score : undefined,
        market_context: item.market_context,
        risk: item.risk,
        confidence: item.confidence,
        as_of: item.as_of || null,
      })),
    },
    {
      id: 'mix3_short',
      title: 'Rank 2 · 3mix short',
      description:
        'Score = short tier (SSS=9…D=0) + diff (short−long) + risk (L+2 / M0 / H−3) + conf (VH+2 … VL−2). Higher score ranks first.',
      rows: withRanks(shortMixRows, ({ item, diff, score }, rank) => ({
        rank,
        ticker: item.ticker,
        tier: item.short_tier,
        other_tier: item.long_tier,
        tier_diff: diff,
        score: Number.isFinite(score) ? score : undefined,
        raw_score: Number.isFinite(item.short_score) ? item.short_score : undefined,
        market_context: item.market_context,
        risk: item.risk,
        confidence: item.confidence,
        as_of: item.as_of || null,
      })),
    },
    {
      id: 'y2y3_long',
      title: 'Rank 3 · y2y3 long',
      description: 'Highest Model 2 position size (hands) first.',
      rows: withRanks(
        [...y2y3].sort((a, b) =>
          compareY2y3Long(
            { ticker: a.ticker, position_size: a.position_size },
            { ticker: b.ticker, position_size: b.position_size }
          )
        ),
        (item, rank) => ({
          rank,
          ticker: item.ticker,
          signal: item.final_signal,
          position_size: item.position_size,
          as_of: item.as_of,
        })
      ),
    },
    {
      id: 'y2y3_short',
      title: 'Rank 4 · y2y3 short',
      description: 'Most negative Model 2 position size (short hands) first.',
      rows: withRanks(
        [...y2y3].sort((a, b) =>
          compareY2y3Short(
            { ticker: a.ticker, position_size: a.position_size },
            { ticker: b.ticker, position_size: b.position_size }
          )
        ),
        (item, rank) => ({
          rank,
          ticker: item.ticker,
          signal: item.final_signal,
          position_size: item.position_size,
          as_of: item.as_of,
        })
      ),
    },
  ]

  return {
    generated_at: new Date().toISOString(),
    ticker_count: EQUITY_TICKERS.length,
    boards,
    errors: errors.length ? errors : undefined,
  }
}
