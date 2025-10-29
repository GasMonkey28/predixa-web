'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'

interface DailyTierData {
  date: string
  long_tier: string
  short_tier: string
  long_score: number
  short_score: number
  summary: string
  suggestions: string[]
  confidence: string
  risk: string
  outlook: string
  disclaimer: string
}

interface DailyTiersProps {
  ticker?: string
}

// Tier strength mapping based on handler.py
const tierStrengths: Record<string, number> = {
  "SSS": 9,
  "SS": 8,
  "S": 7,
  "A+": 6,
  "A": 5,
  "B+": 4,
  "B": 3,
  "C+": 2,
  "C": 1,
  "D": 0
}

// Tier configuration matching AttractiveRecommendationCard style
const tierConfig = {
  S: { 
    label: 'S-Tier', 
    description: 'Exceptional Signal',
    bg: 'from-purple-600 to-pink-600', 
    glow: 'bg-purple-500', 
    text: 'text-purple-300', 
    border: 'border-purple-500',
    strength: 5
  },
  A: { 
    label: 'A-Tier', 
    description: 'Strong Signal',
    bg: 'from-blue-600 to-cyan-600', 
    glow: 'bg-cyan-500', 
    text: 'text-cyan-300', 
    border: 'border-cyan-500',
    strength: 4
  },
  B: { 
    label: 'B-Tier', 
    description: 'Moderate Signal',
    bg: 'from-emerald-600 to-green-600', 
    glow: 'bg-emerald-500', 
    text: 'text-emerald-300', 
    border: 'border-emerald-500',
    strength: 3
  },
  C: { 
    label: 'C-Tier', 
    description: 'Weak Signal',
    bg: 'from-amber-600 to-orange-600', 
    glow: 'bg-amber-500', 
    text: 'text-amber-300', 
    border: 'border-amber-500',
    strength: 2
  },
  D: { 
    label: 'D-Tier', 
    description: 'Very Weak Signal',
    bg: 'from-gray-600 to-gray-700', 
    glow: 'bg-gray-500', 
    text: 'text-gray-400', 
    border: 'border-gray-500',
    strength: 1
  },
};

export default function DailyTiers({ ticker = 'SPY' }: DailyTiersProps) {
  const [tiersData, setTiersData] = useState<DailyTierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTiers() {
      try {
        // Add cache busting parameter to force fresh data
        const response = await fetch(`/api/tiers/daily?t=${Date.now()}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch tier data')
        }
        
        setTiersData(data)
      } catch (err) {
        console.error('Error fetching daily tiers:', err)
        setError('Failed to load tier data')
      } finally {
        setLoading(false)
      }
    }

    fetchTiers()
  }, [ticker])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !tiersData) {
    return (
      <div className="text-center text-red-600 dark:text-red-400">{error || 'No tier data available'}</div>
    )
  }

  // Get tier configuration
  const getTierConfig = (tier: string) => {
    // Manual bar mapping based on user requirement
    let displayStrength = 1; // Default to 1 bar
    
    if (tier.includes('SSS') || tier.includes('SS') || tier === 'S') {
      displayStrength = 5; // S, SS, SSS = 5 bars
    } else if (tier === 'A+' || tier === 'A') {
      displayStrength = 4; // A+, A = 4 bars
    } else if (tier === 'B+' || tier === 'B') {
      displayStrength = 3; // B+, B = 3 bars
    } else if (tier === 'C+' || tier === 'C') {
      displayStrength = 2; // C+, C = 2 bars
    } else if (tier === 'D') {
      displayStrength = 1; // D = 1 bar
    }
    
    // Get base tier for color/styling
    const baseTier = tier.charAt(0)
    
    // Handle special cases like S+, A+, B+, C+, SS, SSS
    if (tier.includes('SSS') || tier.includes('SS')) {
      return { ...tierConfig.S, strength: displayStrength, label: tier }
    }
    if (tier.includes('+')) {
      const base = tierConfig[baseTier as keyof typeof tierConfig]
      return { ...base, strength: displayStrength, label: tier }
    }
    
    return { ...(tierConfig[baseTier as keyof typeof tierConfig] || tierConfig.C), strength: displayStrength }
  }

  const longConfig = getTierConfig(tiersData.long_tier)
  const shortConfig = getTierConfig(tiersData.short_tier)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Daily Signal</h2>
        <span className="text-sm text-gray-400">{tiersData.date}</span>
      </div>

      {/* Tier Cards with Strength Bars */}
      <div className="grid grid-cols-2 gap-4">
        {/* Long Tier */}
        <motion.div
          whileHover={{ scale: 1.02, rotate: -1 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-950 to-green-900 border border-green-700/40 p-4"
        >
          <div className="absolute inset-0 bg-green-600 opacity-5 blur-2xl"></div>
          <div className="relative z-10">
            {/* Header with Tier Badge */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-white">Long</span>
              <motion.div
                whileHover={{ scale: 1.05, rotate: 2 }}
                className={`relative px-4 py-2 rounded-xl bg-gradient-to-r ${longConfig.bg} shadow-lg`}
              >
                <div className={`absolute inset-0 ${longConfig.glow} opacity-50 blur-xl`} />
                <span className="relative z-10 text-white text-sm font-bold">{tiersData.long_tier}</span>
              </motion.div>
            </div>
            
            {/* Strength Bar with Label */}
            <div>
              <div className="text-sm text-white mb-2">Signal Strength</div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`${longConfig.text} text-sm font-semibold`}>{longConfig.label}</span>
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`w-2 h-6 rounded-full ${
                        i < longConfig.strength 
                          ? 'bg-white shadow-lg shadow-white/50' 
                          : 'bg-green-800/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className={`${longConfig.text} text-xs mt-1`}>{longConfig.description}</div>
            </div>
          </div>
        </motion.div>

        {/* Short Tier */}
        <motion.div
          whileHover={{ scale: 1.02, rotate: 1 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-950 to-red-900 border border-red-700/40 p-4"
        >
          <div className="absolute inset-0 bg-red-600 opacity-5 blur-2xl"></div>
          <div className="relative z-10">
            {/* Header with Tier Badge */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-white">Short</span>
              <motion.div
                whileHover={{ scale: 1.05, rotate: -2 }}
                className={`relative px-4 py-2 rounded-xl bg-gradient-to-r ${shortConfig.bg} shadow-lg`}
              >
                <div className={`absolute inset-0 ${shortConfig.glow} opacity-50 blur-xl`} />
                <span className="relative z-10 text-white text-sm font-bold">{tiersData.short_tier}</span>
              </motion.div>
            </div>
            
            {/* Strength Bar with Label */}
            <div>
              <div className="text-sm text-white mb-2">Signal Strength</div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`${shortConfig.text} text-sm font-semibold`}>{shortConfig.label}</span>
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`w-2 h-6 rounded-full ${
                        i < shortConfig.strength 
                          ? 'bg-white shadow-lg shadow-white/50' 
                          : 'bg-red-800/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className={`${shortConfig.text} text-xs mt-1`}>{shortConfig.description}</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Summary */}
      {tiersData.summary && (
        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Summary</h3>
          <p className="text-sm text-blue-200">{tiersData.summary}</p>
        </div>
      )}

      {/* Suggestions */}
      {tiersData.suggestions && tiersData.suggestions.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Suggestions</h3>
          <ul className="space-y-1">
            {tiersData.suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-gray-300 flex items-start">
                <span className="text-gray-500 mr-2">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk & Confidence */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-500/30">
          <div className="text-xs font-semibold text-yellow-300">Confidence</div>
          <div className="text-sm text-yellow-200">{tiersData.confidence}</div>
        </div>
        <div className="bg-orange-900/20 rounded-lg p-3 border border-orange-500/30">
          <div className="text-xs font-semibold text-orange-300">Risk Level</div>
          <div className="text-sm text-orange-200">{tiersData.risk}</div>
        </div>
      </div>

      {/* Disclaimer */}
      {tiersData.disclaimer && (
        <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
          <p className="text-xs text-gray-400 italic">{tiersData.disclaimer}</p>
        </div>
      )}
    </div>
  )
}
