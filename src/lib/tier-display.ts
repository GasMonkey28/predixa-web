/** Shared tier visuals (DailyTiers + Market Insight compact stance) */

export const tierStrengths: Record<string, number> = {
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

export const tierConfig = {
  S: {
    label: 'S-Tier',
    description: 'Exceptional Signal',
    bg: 'from-purple-600 via-pink-600 to-purple-600',
    glow: 'bg-purple-500',
    text: 'text-purple-300',
    border: 'border-purple-500/50',
    strength: 5,
  },
  A: {
    label: 'A-Tier',
    description: 'Strong Signal',
    bg: 'from-yellow-500 via-amber-400 to-yellow-500',
    glow: 'bg-yellow-400',
    text: 'text-yellow-200',
    border: 'border-yellow-400/50',
    strength: 4,
  },
  B: {
    label: 'B-Tier',
    description: 'Moderate Signal',
    bg: 'from-blue-500 via-cyan-400 to-blue-500',
    glow: 'bg-blue-400',
    text: 'text-blue-200',
    border: 'border-blue-400/50',
    strength: 3,
  },
  C: {
    label: 'C-Tier',
    description: 'Weak Signal',
    bg: 'from-gray-100 via-white to-gray-100',
    glow: 'bg-white',
    text: 'text-gray-900',
    border: 'border-white/50',
    strength: 2,
  },
  D: {
    label: 'D-Tier',
    description: 'Very Weak Signal',
    bg: 'from-gray-600 via-gray-700 to-gray-600',
    glow: 'bg-gray-500',
    text: 'text-gray-400',
    border: 'border-gray-500/50',
    strength: 1,
  },
} as const

export type TierVisualConfig = (typeof tierConfig)[keyof typeof tierConfig] & {
  strength: number
  label?: string
}

export function getTierConfig(tier: string): TierVisualConfig {
  let displayStrength = 1
  if (tier.includes('SSS') || tier.includes('SS') || tier === 'S') {
    displayStrength = 5
  } else if (tier === 'A+' || tier === 'A') {
    displayStrength = 4
  } else if (tier === 'B+' || tier === 'B') {
    displayStrength = 3
  } else if (tier === 'C+' || tier === 'C') {
    displayStrength = 2
  } else if (tier === 'D') {
    displayStrength = 1
  }

  const baseTier = tier.charAt(0)
  if (tier.includes('SSS') || tier.includes('SS')) {
    return { ...tierConfig.S, strength: displayStrength, label: tier }
  }
  if (tier.includes('+')) {
    const base = tierConfig[baseTier as keyof typeof tierConfig]
    return { ...base, strength: displayStrength, label: tier }
  }
  return {
    ...(tierConfig[baseTier as keyof typeof tierConfig] || tierConfig.C),
    strength: displayStrength,
  }
}

export function getDominantSignal(longTier: string, shortTier: string): {
  signal: 'LONG' | 'SHORT' | 'NEUTRAL'
  levelDifference: number
} {
  const longLevel = tierStrengths[longTier] ?? 0
  const shortLevel = tierStrengths[shortTier] ?? 0
  const levelDifference = Math.abs(longLevel - shortLevel)
  const longConfig = getTierConfig(longTier)
  const shortConfig = getTierConfig(shortTier)

  if (levelDifference <= 1) {
    return { signal: 'NEUTRAL', levelDifference }
  }
  if (longConfig.strength === shortConfig.strength) {
    return { signal: 'NEUTRAL', levelDifference }
  }
  return {
    signal: longConfig.strength > shortConfig.strength ? 'LONG' : 'SHORT',
    levelDifference,
  }
}
