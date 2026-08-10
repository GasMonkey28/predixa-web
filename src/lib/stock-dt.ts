/** Shared Stock DT constants + types (client + server). */

import type { DtMarketQuotes } from '@/lib/dt-quotes'

export const STOCK_DT_SCORE_LINE = 17
/** Soft sizing guide per side — not a hard buy cap. */
export const STOCK_DT_SIDE_BUDGET = 5000
/** Default Model Reclaim long/short win-rate floor (%). */
export const STOCK_DT_RECLAIM_MIN_WIN_PCT = 80

export type StockDtBuySource = 'ticker_ranks' | 'model_reclaim'

export type StockDtSide = 'long' | 'short'

export interface StockDtCandidate {
  id: string
  side: StockDtSide
  ticker: string
  summaryScore: number
  mixScore?: number
  hands?: number
  signal?: string
  last?: number
  ask?: number
  bid?: number
  previousClose?: number
  netChange?: number
  netChangePct?: number
  /** Price used for sizing (ask for long, bid for short, else last). */
  price: number
  /** Score weight within the side (0–1). */
  weight: number
  /** Soft target dollars from score weight × side budget. */
  targetDollars: number
  quantity: number
  estimatedCost: number
  reason: string
}

export interface StockDtSidePlan {
  side: StockDtSide
  budget: number
  spent: number
  remaining: number
  candidates: StockDtCandidate[]
  skipped: Array<{ ticker: string; score: number; reason: string }>
}

export interface StockDtPlanResponse {
  generated_at: string
  ranks_as_of?: string | null
  /** For model_reclaim: last OHLC bar used for breach math (may lag as_of pre-close). */
  price_as_of?: string | null
  /** Buy universe: Summary ticker ranks or Model Reclaim win-rate filter. */
  source: StockDtBuySource
  score_line: number
  /** For model_reclaim: minimum win_rate_pct used as the score line. */
  min_win_pct?: number
  side_budget: number
  allocation: 'score_weighted'
  market: DtMarketQuotes
  long: StockDtSidePlan
  short: StockDtSidePlan
  warnings?: string[]
  trade_scopes_ok: boolean
  account_id?: string | null
}
