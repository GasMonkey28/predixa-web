export type Direction = 'up' | 'down' | 'flat'
export type Bias = 'long' | 'short' | 'neutral' | 'no_trade' | 'mixed'
export type AgreementLabel =
  | 'strong_agreement'
  | 'partial_agreement'
  | 'mixed'
  | 'insufficient_data'

export interface MarketInsightSection {
  id: string
  title: string
  body: string
}

export interface HorizonLegPlaybook {
  horizon: string
  open_price: number
  pred_high_price: number
  pred_low_price: number
  pred_close_price: number
  direction: Direction
  z: number
  contracts: number
  tier_label: string
  target_price: number
  stop_price: number
}

export interface MarketInsightFacts {
  date: string
  sources: {
    tiers: boolean
    model1: boolean
    model2: boolean
    weekly: boolean
    horizon: boolean
  }
  horizon: {
    as_of_date: string
    legs: HorizonLegPlaybook[]
    bias: Bias
  } | null
  tiers: {
    long_tier: string
    short_tier: string
    bias: Bias
    confidence: string
    risk: string
    tier_spread: number
    outlook: string
  } | null
  model1: {
    model_name: string
    y_directions: Record<string, Direction>
    bullish_count: number
    bearish_count: number
    flat_count: number
    net_bias: Bias
  } | null
  model2: {
    date: string
    final_signal: string
    y1_signal: string
    y2y3_signal: string
    position_size: number
    bias: Bias
  } | null
  weekly: {
    as_of_date: string
    fwd_join_date: string
    t_close_to_pre: number
    direction: Direction
  } | null
  agreement: {
    label: AgreementLabel
    models_aligned: boolean
    aligned_with_tiers: boolean
  }
}

export interface MarketInsightResponse {
  date: string
  facts: MarketInsightFacts
  sections: MarketInsightSection[]
  disclaimer: string
  fallback?: boolean
  error?: string
}
