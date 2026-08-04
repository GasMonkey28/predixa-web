/** Shared Option DT constants + types (client + server). */

export const OPTION_DT_SCORE_LINE = 17
export const OPTION_DT_SIDE_BUDGET = 500

/**
 * Temporary loose mode for debugging / off-hours:
 * - no premium $ band
 * - no OTM-only
 * - no 0–5 DTE cap (use nearest available expirations)
 * - always offer 1 contract (budget is informational)
 */
export const OPTION_DT_LOOSE_FILTERS = true

/** Used only when OPTION_DT_LOOSE_FILTERS is false. */
export const OPTION_DT_MAX_DTE_TRADING_DAYS = 5
export const OPTION_DT_PRICE_MIN = 1
export const OPTION_DT_PRICE_MAX = 3
export const OPTION_DT_PRICE_SOFT_MIN = 0.8
export const OPTION_DT_PRICE_SOFT_MAX = 3.5
export const OPTION_DT_PRICE_TARGET = 2
export const OPTION_DT_PREMIUM_LABEL = '$100–300/contract (~$1–3 quote)'

export type OptionDtSide = 'long' | 'short'

export interface OptionDtCandidate {
  id: string
  side: OptionDtSide
  ticker: string
  summaryScore: number
  mixScore?: number
  hands?: number
  signal?: string
  underlyingLast?: number
  optionSymbol: string
  optionType: 'Call' | 'Put'
  strike: number
  expiration: string
  expirationLabel: string
  dteTradingDays: number
  bid?: number
  ask?: number
  mid?: number
  openInterest: number
  /** Estimated debit per contract (ask * 100). */
  costPerContract: number
  quantity: number
  estimatedCost: number
  reason: string
}

export interface OptionDtSidePlan {
  side: OptionDtSide
  budget: number
  spent: number
  remaining: number
  candidates: OptionDtCandidate[]
  skipped: Array<{ ticker: string; score: number; reason: string }>
}

export interface OptionDtPlanResponse {
  generated_at: string
  ranks_as_of?: string | null
  score_line: number
  side_budget: number
  loose_filters: boolean
  long: OptionDtSidePlan
  short: OptionDtSidePlan
  warnings?: string[]
  trade_scopes_ok: boolean
  account_id?: string | null
}
