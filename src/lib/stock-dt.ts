/** Shared Stock DT constants + types (client + server). */

import type { DtMarketQuotes } from '@/lib/dt-quotes'

export const STOCK_DT_SCORE_LINE = 17
/** Soft sizing guide per side — not a hard buy cap. */
export const STOCK_DT_SIDE_BUDGET = 5000

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
  score_line: number
  side_budget: number
  allocation: 'score_weighted'
  market: DtMarketQuotes
  long: StockDtSidePlan
  short: StockDtSidePlan
  warnings?: string[]
  trade_scopes_ok: boolean
  account_id?: string | null
}
