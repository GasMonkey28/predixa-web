'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { TrendingUp, TrendingDown, Zap, Sparkles, AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react'

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
  prev_date?: string | null
  prev_long_tier?: string | null
  prev_short_tier?: string | null
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

// Tier configuration with enhanced visuals
const tierConfig = {
  S: { 
    label: 'S-Tier', 
    description: 'Exceptional Signal',
    bg: 'from-purple-600 via-pink-600 to-purple-600', 
    glow: 'bg-purple-500', 
    text: 'text-purple-300', 
    border: 'border-purple-500/50',
    strength: 5,
    pulseColor: 'purple'
  },
  A: { 
    label: 'A-Tier', 
    description: 'Strong Signal',
    bg: 'from-yellow-500 via-amber-400 to-yellow-500', 
    glow: 'bg-yellow-400', 
    text: 'text-yellow-200', 
    border: 'border-yellow-400/50',
    strength: 4,
    pulseColor: 'yellow'
  },
  B: { 
    label: 'B-Tier', 
    description: 'Moderate Signal',
    bg: 'from-blue-500 via-cyan-400 to-blue-500', 
    glow: 'bg-blue-400', 
    text: 'text-blue-200', 
    border: 'border-blue-400/50',
    strength: 3,
    pulseColor: 'blue'
  },
  C: { 
    label: 'C-Tier', 
    description: 'Weak Signal',
    bg: 'from-gray-100 via-white to-gray-100', 
    glow: 'bg-white', 
    text: 'text-white', 
    border: 'border-white/50',
    strength: 2,
    pulseColor: 'white'
  },
  D: { 
    label: 'D-Tier', 
    description: 'Very Weak Signal',
    bg: 'from-gray-600 via-gray-700 to-gray-600', 
    glow: 'bg-gray-500', 
    text: 'text-gray-400', 
    border: 'border-gray-500/50',
    strength: 1,
    pulseColor: 'gray'
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
  
  // Determine which signal is stronger for visual emphasis
  const longStrength = longConfig.strength
  const shortStrength = shortConfig.strength
  const dominantSignal = longStrength === shortStrength ? 'NEUTRAL' : (longStrength > shortStrength ? 'LONG' : 'SHORT')

  return (
    <div className="space-y-6">
      {/* Eye-catching Header with Quick Insight */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="relative"
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <motion.div
              className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-50"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-white">Trading Signals</h2>
            <p className="text-xs text-gray-400">ML predictions at market open • Where opportunity meets intelligence</p>
          </div>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative group"
        >
          <div className="px-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700">
            <div className="text-xs text-gray-400 mb-1">Updated</div>
            <div className="text-sm text-white font-semibold">{tiersData.date}</div>
          </div>
          <div className="absolute top-full right-0 mt-2 w-64 p-4 rounded-lg bg-zinc-900 border border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-50">
            <div className="mb-2 text-white font-semibold">Signal Strength Guide:</div>
            <ul className="space-y-1 text-zinc-400 text-sm">
              <li className="text-purple-400">• S-Tier: Exceptional (90%+)</li>
              <li className="text-yellow-400">• A-Tier: Strong (75-89%)</li>
              <li className="text-blue-400">• B-Tier: Moderate (60-74%)</li>
              <li className="text-white">• C-Tier: Weak (45-59%)</li>
              <li className="text-gray-400">• D-Tier: Very Weak (below 45%)</li>
            </ul>
          </div>
        </motion.div>
      </motion.div>

      {/* Dominant Signal Banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={dominantSignal}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className={`relative overflow-hidden rounded-2xl p-6 mb-6 ${
            dominantSignal === 'LONG'
              ? 'bg-gradient-to-r from-emerald-900/40 via-green-900/30 to-emerald-900/40 border-2 border-emerald-500/30'
              : dominantSignal === 'SHORT'
                ? 'bg-gradient-to-r from-red-900/40 via-rose-900/30 to-red-900/40 border-2 border-red-500/30'
                : 'bg-gradient-to-r from-zinc-900/40 via-gray-900/30 to-zinc-900/40 border-2 border-zinc-500/30'
          }`}
        >
          <motion.div
            className={`absolute inset-0 ${
              dominantSignal === 'LONG' ? 'bg-emerald-500' : dominantSignal === 'SHORT' ? 'bg-red-500' : 'bg-zinc-500'
            } opacity-10 blur-3xl`}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                {dominantSignal === 'LONG' ? (
                  <ArrowUpRight className="w-8 h-8 text-green-400" />
                ) : dominantSignal === 'SHORT' ? (
                  <ArrowDownRight className="w-8 h-8 text-rose-400" />
                ) : (
                  <Info className="w-8 h-8 text-zinc-300" />
                )}
              </motion.div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Dominant Signal</div>
                <div className={`text-2xl font-bold ${dominantSignal === 'LONG' ? 'text-green-400' : dominantSignal === 'SHORT' ? 'text-rose-400' : 'text-zinc-300'}`}>
                  {dominantSignal} TREND
                </div>
                <div className="text-sm text-gray-300">
                  {dominantSignal === 'NEUTRAL'
                    ? 'Long and short signals are balanced'
                    : dominantSignal === 'LONG'
                      ? `Long signal is ${(longStrength / shortStrength * 100).toFixed(0)}% stronger`
                      : `Short signal is ${(shortStrength / longStrength * 100).toFixed(0)}% stronger`}
                </div>
              </div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`px-6 py-3 rounded-xl bg-gradient-to-r ${
                dominantSignal === 'LONG' ? longConfig.bg : dominantSignal === 'SHORT' ? shortConfig.bg : 'from-zinc-700 via-gray-700 to-zinc-700'
              } shadow-2xl`}
            >
              <div className="text-white text-2xl font-bold">
                {dominantSignal === 'NEUTRAL' ? `${tiersData.long_tier} / ${tiersData.short_tier}` : (dominantSignal === 'LONG' ? tiersData.long_tier : tiersData.short_tier)}
              </div>
            </motion.div>
      </div>
        </motion.div>
      </AnimatePresence>

      {/* Tier Cards with Enhanced Visuals */}
      <div className="grid grid-cols-2 gap-6">
        {/* Long Tier */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-950/80 to-zinc-900/90 border-2 border-emerald-500/30 p-6"
        >
          {/* Animated background glow */}
          <motion.div
            className="absolute inset-0 bg-emerald-500 opacity-30 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.4, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Subtle moving gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent"
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: "linear"
            }}
          />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                >
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </motion.div>
                <div>
                  <span className="text-lg font-bold text-white block">LONG</span>
                  <span className="text-xs text-green-300">Buy Signal</span>
                </div>
              </div>
              
              {/* Large Tier Badge */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`relative px-6 py-4 rounded-2xl bg-gradient-to-r ${longConfig.bg} shadow-2xl`}
              >
                <motion.div
                  className={`absolute inset-0 ${longConfig.glow} opacity-60 blur-2xl`}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 0.8, 0.6]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <span className="relative z-10 text-white text-3xl font-black tracking-wider">
                  {tiersData.long_tier}
                </span>
              </motion.div>
            </div>
            
            {/* Animated Strength Indicator */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 relative group">
                  <span className="text-sm font-semibold text-white">Signal Strength</span>
                  <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700 cursor-help relative z-10">
                    <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                    <div className="absolute left-full top-0 ml-2 w-56 p-3 rounded-lg bg-zinc-900 border border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-[100] pointer-events-none">
                      <div className="mb-2 text-white font-semibold text-sm">Signal Strength:</div>
                      <ul className="space-y-1 text-zinc-400 text-xs">
                        <li className="text-purple-400">• S-Tier: Exceptional</li>
                        <li className="text-yellow-400">• A-Tier: Strong</li>
                        <li className="text-blue-400">• B-Tier: Moderate</li>
                        <li className="text-white">• C-Tier: Weak</li>
                        <li className="text-gray-400">• D-Tier: Very Weak</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
              </div>
              
              {/* Enhanced Strength Bars */}
              <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                    initial={{ scale: 0, height: 0 }}
                    animate={{ scale: 1, height: 'auto' }}
                    transition={{ 
                      delay: i * 0.15,
                      type: "spring",
                      stiffness: 200
                    }}
                    className="flex-1 relative"
                  >
                    <motion.div
                      className={`h-12 rounded-lg ${
                        i < longConfig.strength 
                          ? `bg-gradient-to-t from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/70` 
                          : 'bg-emerald-900/30'
                      }`}
                      animate={i < longConfig.strength ? {
                        boxShadow: [
                          '0 0 15px rgba(16, 185, 129, 0.6)',
                          '0 0 30px rgba(16, 185, 129, 1)',
                          '0 0 15px rgba(16, 185, 129, 0.6)'
                        ]
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                    {/* Pulse effect on active bars */}
                    {i < longConfig.strength && (
                      <motion.div
                        className="absolute inset-0 bg-green-400 rounded-lg"
                        animate={{
                          opacity: [0, 0.9, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.3
                        }}
                      />
                    )}
                  </motion.div>
                  ))}
                </div>
              
              <div className={`${longConfig.text} text-xs mt-2 font-medium`}>
                {longConfig.description}
              </div>
            </div>
          </div>
          {tiersData.prev_date && (
            <div className="absolute bottom-3 right-3 z-20">
              <span className="px-2.5 py-1 rounded-md text-xs bg-zinc-800/80 border border-zinc-700 text-zinc-200">Prev: {tiersData.prev_long_tier || 'N/A'}</span>
            </div>
          )}
        </motion.div>

        {/* Short Tier */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-950/80 to-zinc-900/90 border-2 border-red-500/30 p-6"
        >
          {/* Animated background glow */}
          <motion.div
            className="absolute inset-0 bg-red-500 opacity-30 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.4, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Subtle moving gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent"
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: "linear"
            }}
          />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                >
                  <TrendingDown className="w-6 h-6 text-rose-400" />
                </motion.div>
                <div>
                  <span className="text-lg font-bold text-white block">SHORT</span>
                  <span className="text-xs text-rose-300">Sell Signal</span>
                </div>
              </div>
              
              {/* Large Tier Badge */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                className={`relative px-6 py-4 rounded-2xl bg-gradient-to-r ${shortConfig.bg} shadow-2xl`}
              >
                <motion.div
                  className={`absolute inset-0 ${shortConfig.glow} opacity-60 blur-2xl`}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 0.8, 0.6]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <span className="relative z-10 text-white text-3xl font-black tracking-wider">
                  {tiersData.short_tier}
                </span>
              </motion.div>
            </div>
            
            {/* Animated Strength Indicator */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 relative group">
                  <span className="text-sm font-semibold text-white">Signal Strength</span>
                  <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700 cursor-help relative z-10">
                    <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                    <div className="absolute left-full top-0 ml-2 w-56 p-3 rounded-lg bg-zinc-900 border border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-[100] pointer-events-none">
                      <div className="mb-2 text-white font-semibold text-sm">Signal Strength:</div>
                      <ul className="space-y-1 text-zinc-400 text-xs">
                        <li className="text-purple-400">• S-Tier: Exceptional</li>
                        <li className="text-yellow-400">• A-Tier: Strong</li>
                        <li className="text-blue-400">• B-Tier: Moderate</li>
                        <li className="text-white">• C-Tier: Weak</li>
                        <li className="text-gray-400">• D-Tier: Very Weak</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
              </div>
              
              {/* Enhanced Strength Bars */}
              <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                    initial={{ scale: 0, height: 0 }}
                    animate={{ scale: 1, height: 'auto' }}
                    transition={{ 
                      delay: i * 0.15,
                      type: "spring",
                      stiffness: 200
                    }}
                    className="flex-1 relative"
                  >
                    <motion.div
                      className={`h-12 rounded-lg ${
                        i < shortConfig.strength 
                          ? `bg-gradient-to-t from-red-500 to-rose-500 shadow-lg shadow-red-500/70` 
                          : 'bg-red-900/30'
                      }`}
                      animate={i < shortConfig.strength ? {
                        boxShadow: [
                          '0 0 15px rgba(239, 68, 68, 0.6)',
                          '0 0 30px rgba(239, 68, 68, 1)',
                          '0 0 15px rgba(239, 68, 68, 0.6)'
                        ]
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                    {/* Pulse effect on active bars */}
                    {i < shortConfig.strength && (
                      <motion.div
                        className="absolute inset-0 bg-rose-400 rounded-lg"
                        animate={{
                          opacity: [0, 0.9, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.3
                        }}
                      />
                    )}
                  </motion.div>
                  ))}
                </div>
              
              <div className={`${shortConfig.text} text-xs mt-2 font-medium`}>
                {shortConfig.description}
              </div>
            </div>
          </div>
          {tiersData.prev_date && (
            <div className="absolute bottom-3 right-3 z-20">
              <span className="px-2.5 py-1 rounded-md text-xs bg-zinc-800/80 border border-zinc-700 text-zinc-200">Prev: {tiersData.prev_short_tier || 'N/A'}</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Risk & Confidence Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-500/30 p-4"
        >
          <div className="absolute inset-0 bg-yellow-500 opacity-5 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-xs font-semibold">Risk Level</span>
            </div>
            <div className="text-yellow-200 font-bold">{tiersData.risk}</div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileHover={{ scale: 1.05, rotate: 2 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg p-4"
        >
          <div className="absolute inset-0 bg-cyan-500 opacity-50 blur-xl" />
          <div className="relative z-10">
            <div className="text-white/80 mb-1 text-sm">Confidence</div>
            <div className="text-white text-xl font-bold">{tiersData.confidence}</div>
          </div>
        </motion.div>
      </div>

      {/* Quick Insights Section */}
      {(tiersData.summary || tiersData.suggestions?.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950/60 via-indigo-950/40 to-purple-950/60 border-2 border-blue-700/30 p-6"
        >
          <motion.div
            className="absolute inset-0 bg-blue-600 opacity-5 blur-3xl"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.05, 0.1, 0.05]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <div className="relative z-10">
            {tiersData.summary && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Quick Insight</h3>
                </div>
                <p className="text-sm text-blue-200 leading-relaxed">{tiersData.summary}</p>
              </div>
            )}

            {tiersData.suggestions && tiersData.suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Key Recommendations</h3>
                <div className="space-y-2">
                  {tiersData.suggestions.slice(0, 3).map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-blue-900/20 border border-blue-700/20"
                    >
                      <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-100 flex-1">{suggestion}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
        </div>
        </motion.div>
      )}
    </div>
  )
}
