/** Shared Stock DT constants + types (client + server). */

import type { DtMarketQuotes } from '@/lib/dt-quotes'

export const STOCK_DT_SCORE_LINE = 17
/** Soft sizing guide per side — not a hard buy cap. */
export const STOCK_DT_SIDE_BUDGET = 5000
/** Default Model Reclaim long win-rate floor (%). */
export const STOCK_DT_RECLAIM_MIN_WIN_PCT = 80
/** Default Model Reclaim short / SellShort win-rate floor (%). */
export const STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT = 60

export type StockDtBuySource = 'ticker_ranks' | 'model_reclaim' | 'model_reclaim_close'

export function parseStockDtBuySource(raw?: string | null): StockDtBuySource {
  const v = (raw || '').trim().toLowerCase()
  if (v === 'ticker_ranks') return 'ticker_ranks'
  if (v === 'model_reclaim_close') return 'model_reclaim_close'
  return 'model_reclaim'
}

export function isReclaimBuySource(
  source: StockDtBuySource | string | null | undefined
): boolean {
  return source === 'model_reclaim' || source === 'model_reclaim_close'
}

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
  open?: number
  netChange?: number
  netChangePct?: number
  fromOpen?: number
  fromOpenPct?: number
  /** Price used for sizing (ask for long, bid for short, else last). */
  price: number
  /** Score weight within the side (0–1). */
  weight: number
  /** Soft target dollars from score weight × side budget. */
  targetDollars: number
  quantity: number
  estimatedCost: number
  reason: string
  /** Model Reclaim band re-entry / flat price (pred_low long, pred_high short). */
  targetClose?: number | null
  /** Model Reclaim short stop; null/undefined for longs or non-reclaim. */
  stopLoss?: number | null
  /** Live reclaim-at-close overshoot vs pred_low. */
  overshoot?: number
  overshootPct?: number
  dayLow?: number
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
  /** Buy universe: ticker ranks, classic reclaim, or live long close-entry. */
  source: StockDtBuySource
  score_line: number
  /** For model_reclaim: long win-rate floor (also legacy single floor). */
  min_win_pct?: number
  min_win_pct_long?: number
  min_win_pct_short?: number
  side_budget: number
  allocation: 'score_weighted'
  market: DtMarketQuotes
  long: StockDtSidePlan
  short: StockDtSidePlan
  warnings?: string[]
  trade_scopes_ok: boolean
  account_id?: string | null
}
