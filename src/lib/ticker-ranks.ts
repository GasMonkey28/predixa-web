import { tierStrengths } from '@/lib/tier-display'

export type RankBoardId =
  | 'mix3_long'
  | 'mix3_short'
  | 'y2y3_long'
  | 'y2y3_short'
  | 'summary_long'
  | 'summary_short'

export interface TickerRankRow {
  rank: number
  ticker: string
  /** Primary 3mix letter for this board (long on rank1, short on rank2) */
  tier?: string
  /** Opposing 3mix letter (short on rank1, long on rank2) */
  other_tier?: string
  /** Primary strength minus opposing strength (0–9 scale) */
  tier_diff?: number
  /** Board score (mix composite, or summary total) */
  score?: number
  /** Rank 1/2 mix composite when shown on a summary board */
  mix_score?: number
  /** Raw 3mix side score before composite adjustments */
  raw_score?: number
  /** Short market context (compensation_explanation, truncated) */
  market_context?: string
  /** Risk label from 3mix summary */
  risk?: string
  /** Confidence label from 3mix summary */
  confidence?: string
  /** y2y3 final_signal */
  signal?: string
  /** y2y3 position_size ("hands") */
  position_size?: number
  /** as-of date from the feeder used */
  as_of?: string | null
  error?: string | null
}
export interface TickerRankBoard {
  id: RankBoardId
  title: string
  description: string
  rows: TickerRankRow[]
}

export interface TickerRanksResponse {
  generated_at: string
  ticker_count: number
  boards: TickerRankBoard[]
  errors?: Array<{ ticker: string; source: 'tiers' | 'y2y3'; error: string }>
}

export function tierStrength(tier: string | null | undefined): number {
  if (!tier || tier === 'N/A') return -1
  return tierStrengths[tier] ?? -1
}

/** Primary strength − opposing strength; null if either side missing. */
export function tierDiff(
  primary: string | null | undefined,
  opposing: string | null | undefined
): number | undefined {
  const a = tierStrength(primary)
  const b = tierStrength(opposing)
  if (a < 0 || b < 0) return undefined
  return a - b
}

/** Keep risk readable in a narrow column (e.g. "LOW - Strong signal" → "LOW"). */
export function shortRisk(risk: string | null | undefined): string | undefined {
  const raw = (risk || '').replace(/\s+/g, ' ').trim()
  if (!raw) return undefined
  const head = raw.split(/\s*[-–—|]\s*/)[0]?.trim()
  return head || raw
}

/** low +2, moderate 0, high −3 */
export function riskAdj(risk: string | null | undefined): number {
  const head = (shortRisk(risk) || risk || '').toLowerCase().trim()
  if (head === 'high') return -3
  if (head === 'moderate' || head === 'medium' || head === 'med') return 0
  if (head === 'low') return 2
  if (head.includes('high')) return -3
  if (head.includes('low')) return 2
  return 0
}

/** very high +2, high +1, moderate 0, low -1, very low -2 */
export function confidenceAdj(confidence: string | null | undefined): number {
  const s = (confidence || '').toLowerCase().replace(/\s+/g, ' ').trim()
  if (!s) return 0
  if (s.includes('very high')) return 2
  if (s.includes('very low')) return -2
  if (/\bhigh\b/.test(s)) return 1
  if (/\blow\b/.test(s)) return -1
  if (s.includes('moderate') || s.includes('medium')) return 0
  return 0
}

/**
 * Rank score = primary tier strength (SSS=9…D=0) + tier diff + risk adj + confidence adj.
 * Always an integer. Rank 1 uses long tier; Rank 2 uses short tier.
 */
export function mix3CompositeScore(input: {
  primaryTier: string
  opposingTier: string
  risk?: string | null
  confidence?: string | null
}): number {
  const primary = tierStrength(input.primaryTier)
  if (primary < 0) return Number.NEGATIVE_INFINITY
  const diff = tierDiff(input.primaryTier, input.opposingTier) ?? 0
  return primary + diff + riskAdj(input.risk) + confidenceAdj(input.confidence)
}

/** Higher composite score first. */
export function compareMix3Composite(
  a: { score: number; ticker: string },
  b: { score: number; ticker: string }
): number {
  if (b.score !== a.score) return b.score - a.score
  return a.ticker.localeCompare(b.ticker)
}

/** Summary long: +2 when y2y3 hands are +5 or +7. */
export function summaryLongHandsBonus(positionSize: number): number {
  return positionSize === 5 || positionSize === 7 ? 2 : 0
}

/** Summary short: +2 when y2y3 hands are −5 or −7. */
export function summaryShortHandsBonus(positionSize: number): number {
  return positionSize === -5 || positionSize === -7 ? 2 : 0
}

/** Highest +hands first. */
export function compareY2y3Long(
  a: { position_size: number; ticker: string },
  b: { position_size: number; ticker: string }
): number {
  if (b.position_size !== a.position_size) return b.position_size - a.position_size
  return a.ticker.localeCompare(b.ticker)
}

/** Strongest short (most negative hands) first. */
export function compareY2y3Short(
  a: { position_size: number; ticker: string },
  b: { position_size: number; ticker: string }
): number {
  if (a.position_size !== b.position_size) return a.position_size - b.position_size
  return a.ticker.localeCompare(b.ticker)
}

/** Shorten market-context prose for dense rank tables. */
export function shortMarketContext(
  explanation: string | null | undefined,
  summaryFallback?: string | null,
  maxLen = 72
): string | undefined {
  const raw = (explanation || summaryFallback || '').replace(/\s+/g, ' ').trim()
  if (!raw) return undefined
  if (raw.length <= maxLen) return raw
  const cut = raw.slice(0, maxLen - 1)
  const sp = cut.lastIndexOf(' ')
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trimEnd()}…`
}

export function withRanks<T>(
  sorted: T[],
  mapRow: (item: T, rank: number) => TickerRankRow
): TickerRankRow[] {
  return sorted.map((item, i) => mapRow(item, i + 1))
}
