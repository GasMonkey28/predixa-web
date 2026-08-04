/** Shared Option DT constants + types (client + server). */

export const OPTION_DT_SCORE_LINE = 17
export const OPTION_DT_SIDE_BUDGET = 500

/**
 * Loose mode (debug): no premium band / OTM-only / DTE cap; always 1 contract.
 * Keep false for production Option DT rules.
 */
export const OPTION_DT_LOOSE_FILTERS = false

/** Used only when OPTION_DT_LOOSE_FILTERS is false. */
export const OPTION_DT_MAX_DTE_TRADING_DAYS = 5
/** Quote per share; debit/contract = quote × 100 → $20–$300. */
export const OPTION_DT_PRICE_MIN = 0.2
export const OPTION_DT_PRICE_MAX = 3
export const OPTION_DT_PRICE_SOFT_MIN = 0.15
export const OPTION_DT_PRICE_SOFT_MAX = 3.5
/** Drop contracts above this quote from the dropdown (keeps cheap/ATM range). */
export const OPTION_DT_PICKER_PRICE_MAX = 5
export const OPTION_DT_PRICE_TARGET = 1.5
export const OPTION_DT_PREMIUM_LABEL = '$20–300/contract (~$0.20–3 quote)'

export type OptionDtSide = 'long' | 'short'

/** Alternate contracts the user can pick for a candidate ticker. */
export interface OptionDtContractChoice {
  optionSymbol: string
  strike: number
  expiration: string
  dteTradingDays: number
  bid?: number
  ask?: number
  mid?: number
  openInterest: number
  costPerContract: number
  label: string
}

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
  /** Other contracts in band for this ticker (includes the selected one). */
  alternatives?: OptionDtContractChoice[]
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
