import type {
  MarketInsightFacts,
  MarketInsightSection,
} from '@/lib/server/market-insight-types'

const Y_ORDER = ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8'] as const

function tierBiasCopy(bias: string, long: string, short: string, spread: number): string {
  if (bias === 'long') {
    return `Tier rankings favor upside today (${long} long vs ${short} short, spread +${spread}).`
  }
  if (bias === 'short') {
    return `Tier rankings favor downside today (${long} long vs ${short} short, spread ${spread}).`
  }
  return `Tier rankings are balanced (${long} vs ${short})—no strong directional edge from tiers alone.`
}

function confidenceCopy(confidence: string, risk: string): string {
  const conf = confidence && confidence !== 'Unknown' ? confidence : 'unspecified'
  const riskText = risk && risk !== 'Unknown' ? risk : 'unspecified risk'
  return `Pipeline confidence is ${conf}; risk context: ${riskText}.`
}

function model1Copy(facts: MarketInsightFacts): string {
  const m = facts.model1!
  const parts = Y_ORDER.map((k) => `${k.toUpperCase()}: ${m.y_directions[k]}`).join(', ')
  return `Model 1 (${m.model_name}) shows ${m.bullish_count} up / ${m.bearish_count} down / ${m.flat_count} flat horizons (${parts}). Net read: ${m.net_bias}.`
}

function model2Copy(facts: MarketInsightFacts): string {
  const m = facts.model2!
  return `Model 2 (y2/y3 blend) for ${m.date}: final ${m.final_signal.replace(/_/g, ' ')}, y1 ${m.y1_signal.replace(/_/g, ' ')}, y2+y3 ${m.y2y3_signal.replace(/_/g, ' ')} (size ${m.position_size}).`
}

function weeklyCopy(facts: MarketInsightFacts): string {
  const w = facts.weekly!
  const dir =
    w.direction === 'up'
      ? 'higher'
      : w.direction === 'down'
        ? 'lower'
        : 'near flat vs'
  return `Weekly SPY outlook (week ending ${w.fwd_join_date}): model implies ${dir} close vs prior week (t_close_to_pre ${w.t_close_to_pre >= 0 ? '+' : ''}${w.t_close_to_pre.toFixed(2)}).`
}

function agreementCopy(facts: MarketInsightFacts): string {
  const { label, models_aligned, aligned_with_tiers } = facts.agreement
  if (label === 'strong_agreement') {
    return 'Daily tiers, Model 1 horizons, and Model 2 signals point the same way—treat as higher internal consistency (not a guarantee).'
  }
  if (label === 'partial_agreement') {
    const bits = []
    if (models_aligned) bits.push('Model 1 and Model 2 agree')
    if (aligned_with_tiers) bits.push('at least one model aligns with tiers')
    return `Mixed but not chaotic: ${bits.join('; ') || 'some inputs align'}. Size and confirm with your own plan.`
  }
  if (label === 'insufficient_data') {
    return 'One or more inputs are missing—read the sections above with extra caution.'
  }
  return 'Models and tiers disagree today—avoid forcing a single narrative; wait for clearer alignment or reduce size.'
}

export function buildMarketInsightSections(facts: MarketInsightFacts): MarketInsightSection[] {
  const sections: MarketInsightSection[] = []

  if (facts.tiers) {
    sections.push({
      id: 'tiers',
      title: "Today's tier stance",
      body: [tierBiasCopy(facts.tiers.bias, facts.tiers.long_tier, facts.tiers.short_tier, facts.tiers.tier_spread), confidenceCopy(facts.tiers.confidence, facts.tiers.risk)]
        .filter(Boolean)
        .join(' '),
    })
    if (facts.tiers.outlook) {
      sections[sections.length - 1].body += ` Outlook: ${facts.tiers.outlook}`
    }
  } else {
    sections.push({
      id: 'tiers',
      title: "Today's tier stance",
      body: 'Tier summary is temporarily unavailable for this session.',
    })
  }

  const modelParts: string[] = []
  if (facts.model1) modelParts.push(model1Copy(facts))
  if (facts.model2) modelParts.push(model2Copy(facts))
  sections.push({
    id: 'models',
    title: 'Model signals',
    body:
      modelParts.length > 0
        ? modelParts.join(' ')
        : 'Model 1 and Model 2 outputs are not available yet for this date.',
  })

  if (facts.weekly) {
    sections.push({
      id: 'weekly',
      title: 'Weekly context',
      body: weeklyCopy(facts),
    })
  }

  sections.push({
    id: 'agreement',
    title: 'Alignment check',
    body: agreementCopy(facts),
  })

  return sections.slice(0, 4)
}
