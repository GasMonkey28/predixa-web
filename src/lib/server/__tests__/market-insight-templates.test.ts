import { buildMarketInsightSections } from '@/lib/server/market-insight-templates'
import type { MarketInsightFacts } from '@/lib/server/market-insight-types'

const baseFacts: MarketInsightFacts = {
  date: '2026-05-28',
  sources: { tiers: true, model1: true, model2: true, weekly: false, horizon: false },
  horizon: null,
  tiers: {
    long_tier: 'S',
    short_tier: 'B',
    bias: 'long',
    confidence: 'High',
    risk: 'MODERATE',
    tier_spread: 4,
    outlook: 'Upside favored',
  },
  model1: {
    model_name: 'Model1_Random_forest_OldFeature4',
    y_directions: {
      y1: 'up',
      y2: 'down',
      y3: 'down',
      y4: 'up',
      y5: 'down',
      y6: 'down',
      y7: 'up',
      y8: 'up',
    },
    bullish_count: 4,
    bearish_count: 4,
    flat_count: 0,
    net_bias: 'mixed',
  },
  model2: {
    date: '2026-05-28',
    final_signal: 'long',
    y1_signal: 'long',
    y2y3_signal: 'no_trade',
    position_size: 1,
    bias: 'long',
  },
  weekly: null,
  agreement: {
    label: 'partial_agreement',
    models_aligned: false,
    aligned_with_tiers: true,
  },
}

describe('buildMarketInsightSections', () => {
  it('returns 2–4 sections with disclaimer-ready copy', () => {
    const sections = buildMarketInsightSections(baseFacts)
    expect(sections.length).toBeGreaterThanOrEqual(2)
    expect(sections.length).toBeLessThanOrEqual(4)
    expect(sections.some((s) => s.id === 'tiers')).toBe(true)
    expect(sections.some((s) => s.id === 'models')).toBe(true)
    expect(sections.some((s) => s.id === 'agreement')).toBe(true)
    expect(sections.find((s) => s.id === 'tiers')?.body).toMatch(/S/)
  })
})
