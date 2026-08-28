import axios from 'axios'

import {
  etDateString,
  fetchLatestSummary,
  subtractDaysFromDate,
} from '@/lib/server/summary-json'
import {
  findFridayOfWeekContaining,
  formatDateYYYYMMDD,
  getMarketAnchorDate,
} from '@/lib/trading-calendar'
import type {
  AgreementLabel,
  Bias,
  Direction,
  HorizonLegPlaybook,
  MarketInsightFacts,
  MarketInsightSection,
} from '@/lib/server/market-insight-types'
import { buildMarketInsightSections } from '@/lib/server/market-insight-templates'

const MODEL1_FILENAME = 'Model1_Random_forest_OldFeature4.json'
const MODELS_PREFIX = 'ml_out'
const MAX_LOOKBACK_DAYS = 10
const Y_KEYS = ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8'] as const
const FLAT_THRESHOLD = 0.01

const HORIZON_KEY = 'charts/moneyflow_horizon/latest.json'
// Only these two horizons carry a backtested position-sizing tier table (see
// /summary/playbook) -- 5d/15d are shown elsewhere but were never validated
// as standalone entries, so they're left out of the playbook's z-score/size math.
const HORIZON_LEGS_TRACKED = ['10d', '20d'] as const
// Conviction z = |predicted move| / predicted band width, tiered from the
// pooled percentile distribution of this signal across the backtest (see the
// MES strategy playbook artifact for the full derivation).
const HORIZON_SIZE_TIERS: Array<[number, number, string]> = [
  [0.19, 0, 'no trade'],
  [0.29, 2, 'small'],
  [0.37, 4, 'normal'],
  [0.49, 6, 'normal'],
  [0.6, 10, 'large'],
  [Infinity, 20, 'max'],
]
const HORIZON_STOP_MULT = 0.5

const tierStrengths: Record<string, number> = {
  SSS: 9,
  SS: 8,
  S: 7,
  'A+': 6,
  A: 5,
  'B+': 4,
  B: 3,
  'C+': 2,
  C: 1,
  D: 0,
}

const fetchHeaders = {
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
}

function s3Url(bucket: string, key: string): string {
  return `https://${bucket}.s3.amazonaws.com/${key}`
}

function getTierRank(tier: string): number {
  if (!tier || tier === 'N/A') return 0
  return tierStrengths[tier.toUpperCase().trim()] ?? 0
}

function predDirection(value: number): Direction {
  if (value > FLAT_THRESHOLD) return 'up'
  if (value < -FLAT_THRESHOLD) return 'down'
  return 'flat'
}

function signalToBias(signal: string): Bias {
  const s = (signal || '').toLowerCase()
  if (s.includes('long') || s === 'buy') return 'long'
  if (s.includes('short') || s === 'sell') return 'short'
  if (s === 'no_trade' || s === 'none' || s === 'neutral') return 'no_trade'
  return 'neutral'
}

function tierBias(longTier: string, shortTier: string): Bias {
  const spread = getTierRank(longTier) - getTierRank(shortTier)
  if (spread >= 2) return 'long'
  if (spread <= -2) return 'short'
  return 'neutral'
}

function directionsToNetBias(counts: { up: number; down: number; flat: number }): Bias {
  if (counts.up >= 5 && counts.down <= 2) return 'long'
  if (counts.down >= 5 && counts.up <= 2) return 'short'
  if (counts.up > counts.down + 2) return 'long'
  if (counts.down > counts.up + 2) return 'short'
  return 'mixed'
}

function biasToDirection(bias: Bias): Direction | null {
  if (bias === 'long') return 'up'
  if (bias === 'short') return 'down'
  return null
}

function computeAgreement(
  tiers: MarketInsightFacts['tiers'],
  model1: MarketInsightFacts['model1'],
  model2: MarketInsightFacts['model2'],
  horizon: MarketInsightFacts['horizon']
): MarketInsightFacts['agreement'] {
  const signals: Direction[] = []
  const tierDir = tiers ? biasToDirection(tiers.bias) : null
  const m1Dir = model1 ? biasToDirection(model1.net_bias) : null
  const m2Dir = model2 ? biasToDirection(model2.bias) : null
  const hDir = horizon ? biasToDirection(horizon.bias) : null

  if (tierDir) signals.push(tierDir)
  if (m1Dir) signals.push(m1Dir)
  if (m2Dir) signals.push(m2Dir)
  if (hDir) signals.push(hDir)

  if (signals.length < 2) {
    return {
      label: 'insufficient_data',
      models_aligned: false,
      aligned_with_tiers: false,
    }
  }

  const allSame = signals.every((d) => d === signals[0])
  const modelsOnly = [m1Dir, m2Dir].filter((d): d is Direction => d != null)
  const modelsAligned =
    modelsOnly.length === 2 && modelsOnly[0] === modelsOnly[1]

  let label: AgreementLabel = 'mixed'
  if (allSame && signals.length >= 2) label = 'strong_agreement'
  else if (modelsAligned || (tierDir && signals.filter((d) => d === tierDir).length >= 2)) {
    label = 'partial_agreement'
  }

  return {
    label,
    models_aligned: modelsAligned,
    aligned_with_tiers: tierDir != null && signals.filter((d) => d === tierDir).length >= 2,
  }
}

async function fetchModel1ForDate(
  bucket: string,
  startDate: string
): Promise<{ date: string; data: Record<string, unknown> } | null> {
  let lastError: unknown
  for (let offset = 0; offset < MAX_LOOKBACK_DAYS; offset++) {
    const date = subtractDaysFromDate(startDate, offset)
    const key = `${MODELS_PREFIX}/${date}/${MODEL1_FILENAME}`
    try {
      const response = await axios.get(s3Url(bucket, key), {
        headers: fetchHeaders,
        timeout: 10000,
      })
      return { date, data: response.data as Record<string, unknown> }
    } catch (err) {
      lastError = err
    }
  }
  return null
}

async function fetchModel2Today(bucket: string): Promise<Record<string, unknown> | null> {
  const key = 'model2_y2y3/chart/latest.json'
  try {
    const response = await axios.get(s3Url(bucket, key), {
      headers: fetchHeaders,
      timeout: 10000,
    })
    const data = response.data as Record<string, unknown>
    let today = data.today as Record<string, unknown> | undefined
    if (!today && Array.isArray(data.trading_days) && data.trading_days.length > 0) {
      const lastDay = data.trading_days[data.trading_days.length - 1] as Record<string, unknown>
      today = {
        date: lastDay.as_of_date,
        final_signal: lastDay.final_signal,
        position_size: lastDay.position_size,
        y1_signal: lastDay.y1_signal,
        y2y3_signal: lastDay.y2y3_signal,
        pred_y1: lastDay.pred_y1,
        pred_y2_plus_y3: lastDay.pred_y2_plus_y3,
      }
    }
    return today ?? null
  } catch {
    return null
  }
}

function sizeForZ(z: number): { contracts: number; label: string } {
  const az = Math.abs(z)
  for (const [upper, contracts, label] of HORIZON_SIZE_TIERS) {
    if (az < upper) return { contracts, label }
  }
  return { contracts: 20, label: 'max' }
}

function buildHorizonLeg(horizon: string, leg: Record<string, unknown>): HorizonLegPlaybook | null {
  const open = Number(leg.open_price)
  const high = Number(leg.pred_high_price)
  const low = Number(leg.pred_low_price)
  const close = Number(leg.pred_close_price)
  if (![open, high, low, close].every(Number.isFinite)) return null

  const band = high - low
  if (!(band > 0)) return null

  const move = close - open
  const z = Math.abs(move) / band
  const direction: Direction = move > 0 ? 'up' : move < 0 ? 'down' : 'flat'
  const { contracts, label } = sizeForZ(z)

  return {
    horizon,
    open_price: open,
    pred_high_price: high,
    pred_low_price: low,
    pred_close_price: close,
    direction,
    z,
    contracts,
    tier_label: label,
    target_price: close,
    stop_price: direction === 'up' ? open - HORIZON_STOP_MULT * band : open + HORIZON_STOP_MULT * band,
  }
}

async function fetchHorizonToday(bucket: string): Promise<MarketInsightFacts['horizon']> {
  try {
    const response = await axios.get(s3Url(bucket, HORIZON_KEY), {
      headers: fetchHeaders,
      timeout: 10000,
    })
    const data = response.data as Record<string, unknown>
    const predictions = (data.predictions as Record<string, Record<string, unknown>>) || {}
    const legs: HorizonLegPlaybook[] = []
    for (const h of HORIZON_LEGS_TRACKED) {
      const leg = predictions[h]
      if (!leg) continue
      const built = buildHorizonLeg(h, leg)
      if (built) legs.push(built)
    }
    if (legs.length === 0) return null

    const ups = legs.filter((l) => l.direction === 'up' && l.contracts > 0).length
    const downs = legs.filter((l) => l.direction === 'down' && l.contracts > 0).length
    let bias: Bias = 'neutral'
    if (ups > 0 && downs === 0) bias = 'long'
    else if (downs > 0 && ups === 0) bias = 'short'
    else if (ups > 0 && downs > 0) bias = 'mixed'

    return {
      as_of_date: String(data.as_of_date ?? ''),
      legs,
      bias,
    }
  } catch {
    return null
  }
}

async function fetchCurrentWeekly(
  bucket: string,
  ticker: string
): Promise<Record<string, unknown> | null> {
  const anchor = getMarketAnchorDate()
  const friday = findFridayOfWeekContaining(anchor)
  const dateStr = formatDateYYYYMMDD(friday)
  const key = `weekly/${dateStr}/${ticker.toUpperCase()}.json`
  try {
    const response = await axios.get(s3Url(bucket, key), {
      headers: fetchHeaders,
      timeout: 10000,
    })
    return response.data as Record<string, unknown>
  } catch {
    return null
  }
}

export async function buildMarketInsight(
  bucket: string,
  ticker: string
): Promise<{ facts: MarketInsightFacts; sections: MarketInsightSection[]; disclaimer: string }> {
  const today = etDateString(0)
  const disclaimer =
    'Educational market commentary only—not financial advice. Signals are model outputs and can be wrong; always do your own research and manage risk.'

  let summaryDate = today
  let summaryData: Record<string, unknown> | null = null
  try {
    const latest = await fetchLatestSummary(bucket, today)
    summaryDate = latest.date
    summaryData = latest.data
  } catch {
    summaryData = null
  }

  const model1Result = await fetchModel1ForDate(bucket, summaryDate)
  const model2Today = await fetchModel2Today(bucket)
  const weeklyRaw = await fetchCurrentWeekly(bucket, ticker)
  const horizon = await fetchHorizonToday(bucket)

  const longTier =
    (summaryData?.long_signal as string) ||
    (summaryData?.long_tier as string) ||
    (summaryData?.longTier as string) ||
    'N/A'
  const shortTier =
    (summaryData?.short_signal as string) ||
    (summaryData?.short_tier as string) ||
    (summaryData?.shortTier as string) ||
    'N/A'

  const tiers =
    summaryData != null
      ? {
          long_tier: longTier,
          short_tier: shortTier,
          bias: tierBias(longTier, shortTier),
          confidence: String(summaryData.confidence ?? summaryData.CONFIDENCE ?? 'Unknown'),
          risk: String(summaryData.risk ?? summaryData.RISK ?? 'Unknown'),
          tier_spread: getTierRank(longTier) - getTierRank(shortTier),
          outlook: String(summaryData.outlook ?? summaryData.OUTLOOK ?? ''),
        }
      : null

  let model1: MarketInsightFacts['model1'] = null
  if (model1Result) {
    const preds = (model1Result.data.predictions as Record<string, number>) || {}
    const y_directions: Record<string, Direction> = {}
    let bullish = 0
    let bearish = 0
    let flat = 0
    for (const key of Y_KEYS) {
      const dir = predDirection(Number(preds[key] ?? 0))
      y_directions[key] = dir
      if (dir === 'up') bullish++
      else if (dir === 'down') bearish++
      else flat++
    }
    model1 = {
      model_name: String(model1Result.data.model_name ?? MODEL1_FILENAME),
      y_directions,
      bullish_count: bullish,
      bearish_count: bearish,
      flat_count: flat,
      net_bias: directionsToNetBias({ up: bullish, down: bearish, flat }),
    }
  }

  let model2: MarketInsightFacts['model2'] = null
  if (model2Today) {
    const finalSignal = String(model2Today.final_signal ?? 'no_trade')
    model2 = {
      date: String(model2Today.date ?? summaryDate),
      final_signal: finalSignal,
      y1_signal: String(model2Today.y1_signal ?? 'no_trade'),
      y2y3_signal: String(model2Today.y2y3_signal ?? 'no_trade'),
      position_size: Number(model2Today.position_size ?? 0),
      bias: signalToBias(finalSignal),
    }
  }

  let weekly: MarketInsightFacts['weekly'] = null
  if (weeklyRaw) {
    const tClose = Number(weeklyRaw.t_close_to_pre ?? 0)
    weekly = {
      as_of_date: String(weeklyRaw.as_of_date ?? ''),
      fwd_join_date: String(weeklyRaw.fwd_join_date ?? ''),
      t_close_to_pre: tClose,
      direction: predDirection(tClose),
    }
  }

  const facts: MarketInsightFacts = {
    date: summaryDate,
    sources: {
      tiers: tiers != null,
      model1: model1 != null,
      model2: model2 != null,
      weekly: weekly != null,
      horizon: horizon != null,
    },
    horizon,
    tiers,
    model1,
    model2,
    weekly,
    agreement: computeAgreement(tiers, model1, model2, horizon),
  }

  const sections = buildMarketInsightSections(facts)

  return { facts, sections, disclaimer }
}
