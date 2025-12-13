'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, X, HelpCircle } from 'lucide-react'
import CandlestickChart from '@/components/charts/CandlestickChart'

interface HistoryData {
  date: string
  open: number
  high: number
  low: number
  close: number
  long_tier: string
  short_tier: string
}

export default function HistoryPageContent() {
  const [data, setData] = useState<HistoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/history-20?t=${Date.now()}`)
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch history data')
        }
        
        setData(result.data || [])
      } catch (err) {
        console.error('Error fetching history data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load history data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </main>
    )
  }

  if (error || !data.length) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="text-center text-red-600">{error || 'No data available'}</div>
      </main>
    )
  }

  // Tier strength mapping for prediction calculation
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

  // Get tier numeric rank
  const getTierRank = (tier: string): number => {
    if (!tier || tier === 'N/A') return 0
    const tierUpper = tier.toUpperCase().trim()
    return tierStrengths[tierUpper] ?? 0
  }

  // Get prediction status: 'correct', 'incorrect', or 'neutral'
  const getPredictionStatus = (item: HistoryData): 'correct' | 'incorrect' | 'neutral' => {
    const longRank = getTierRank(item.long_tier)
    const shortRank = getTierRank(item.short_tier)
    const rankDiff = longRank - shortRank
    const absRankDiff = Math.abs(rankDiff)
    
    // If tier difference is <= 1, it's neutral (weak/no clear signal)
    if (absRankDiff <= 1) {
      return 'neutral'
    }
    
    const priceDiff = item.close - item.open
    
    // Prediction is correct if both have same sign (both positive or both negative)
    // longRank > shortRank means long signal is stronger (predicts up)
    // longRank < shortRank means short signal is stronger (predicts down)
    const isCorrect = (rankDiff > 0 && priceDiff > 0) || (rankDiff < 0 && priceDiff < 0)
    return isCorrect ? 'correct' : 'incorrect'
  }

  // Check if an incorrect prediction was compensated later
  const isCompensated = (item: HistoryData, itemIndex: number, allData: HistoryData[]): boolean => {
    const longRank = getTierRank(item.long_tier)
    const shortRank = getTierRank(item.short_tier)
    const rankDiff = longRank - shortRank
    const absRankDiff = Math.abs(rankDiff)
    
    // Only check compensation for incorrect predictions (non-neutral)
    if (absRankDiff <= 1) {
      return false
    }
    
    const priceDiff = item.close - item.open
    const isCorrect = (rankDiff > 0 && priceDiff > 0) || (rankDiff < 0 && priceDiff < 0)
    
    // Only check compensation if prediction was incorrect
    if (isCorrect) {
      return false
    }
    
    // Check later days for compensation
    const laterDays = allData.slice(itemIndex + 1)
    const xDayOpenPrice = item.open
    
    // If predicted UP (rankDiff > 0) but price went DOWN (priceDiff < 0)
    // Check if any later day's open, close, or high exceeds X day's open
    if (rankDiff > 0 && priceDiff < 0) {
      for (const laterDay of laterDays) {
        if (laterDay.open > xDayOpenPrice || 
            laterDay.close > xDayOpenPrice || 
            laterDay.high > xDayOpenPrice) {
          return true // Compensated - price eventually went above X day's open
        }
      }
    }
    
    // If predicted DOWN (rankDiff < 0) but price went UP (priceDiff > 0)
    // Check if any later day's open, close, or low is below X day's open
    if (rankDiff < 0 && priceDiff > 0) {
      for (const laterDay of laterDays) {
        if (laterDay.open < xDayOpenPrice || 
            laterDay.close < xDayOpenPrice || 
            laterDay.low < xDayOpenPrice) {
          return true // Compensated - price eventually went below X day's open
        }
      }
    }
    
    return false
  }

  // Prepare chart data with tier information, prediction status, and compensation
  const chartData = data.map((item, index) => ({
    time: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: 0,
    long_tier: item.long_tier,
    short_tier: item.short_tier,
    predictionStatus: getPredictionStatus(item),
    isCompensated: isCompensated(item, index, data)
  }))

  // Tier color mapping
  const getTierColor = (tier: string) => {
    const tierUpper = tier.toUpperCase()
    if (tierUpper.includes('S')) return 'text-purple-400'
    if (tierUpper.includes('A')) return 'text-yellow-400'
    if (tierUpper.includes('B')) return 'text-blue-400'
    if (tierUpper.includes('C')) return 'text-green-400'
    return 'text-gray-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
      
      <div className="relative mx-auto max-w-7xl p-6">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Trading History
          </h1>
          <p className="text-gray-300 text-lg">Last 20 Trading Days - SPY OHLC & Tier Rankings</p>
        </motion.div>

        {/* Chart Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-zinc-200">SPY Daily Candlestick Chart</h2>
              <p className="text-zinc-400 text-sm mt-1">Last 20 Trading Days</p>
            </div>
            <CandlestickChart data={chartData} height={400} />
          </div>
        </motion.div>

        {/* Tier Rankings Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-2 border-zinc-800/50 p-6 backdrop-blur-sm"
        >
          <h2 className="text-2xl font-semibold text-zinc-200 mb-6">Daily Tier Rankings</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 text-zinc-300 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 text-zinc-300 font-semibold">Long Tier</th>
                  <th className="text-left py-3 px-4 text-zinc-300 font-semibold">Short Tier</th>
                  <th className="text-left py-3 px-4 text-zinc-300 font-semibold">
                    <div className="flex items-center gap-2">
                      <span>Prediction</span>
                      <div className="relative group">
                        <HelpCircle className="w-4 h-4 text-zinc-400 hover:text-zinc-300 cursor-help" />
                        <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <p className="text-xs text-zinc-200 leading-relaxed">
                            Shows if the prediction was correct based on tier rankings and actual price movement:
                            <br /><br />
                            <strong className="text-green-400">✓ Checkmark:</strong> Prediction was correct (long tier stronger and price went up, or short tier stronger and price went down).
                            <br /><br />
                            <strong className="text-red-400">✗ X Mark:</strong> Prediction was incorrect (opposite direction occurred).
                            <br /><br />
                            <strong className="text-zinc-400">− Dash:</strong> Neutral signal (long and short tiers are the same or one level apart - no clear prediction).
                          </p>
                          <div className="absolute left-4 top-0 transform -translate-y-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-zinc-800"></div>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-zinc-300 font-semibold">
                    <div className="flex items-center gap-2">
                      <span>Compensation</span>
                      <div className="relative group">
                        <HelpCircle className="w-4 h-4 text-zinc-400 hover:text-zinc-300 cursor-help" />
                        <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <p className="text-xs text-zinc-200 leading-relaxed">
                            Shows if an incorrect prediction was later compensated by price movement:
                            <br /><br />
                            <strong className="text-green-400">✓ Checkmark:</strong> Predicted up but went down (or vice versa), then later days moved in the predicted direction.
                          </p>
                          <div className="absolute left-4 top-0 transform -translate-y-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-zinc-800"></div>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-zinc-300 font-semibold">OHLC</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => {
                  const date = new Date(item.date)
                  const dateStr = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })
                  const status = getPredictionStatus(item)
                  const compensated = isCompensated(item, index, data)
                  
                  return (
                    <tr 
                      key={item.date} 
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-4 px-4 text-zinc-300 font-medium">{dateStr}</td>
                      <td className={`py-4 px-4 font-semibold ${getTierColor(item.long_tier)}`}>
                        {item.long_tier}
                      </td>
                      <td className={`py-4 px-4 font-semibold ${getTierColor(item.short_tier)}`}>
                        {item.short_tier}
                      </td>
                      <td className="py-4 px-4">
                        {status === 'correct' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : status === 'incorrect' ? (
                          <X className="w-5 h-5 text-red-500" />
                        ) : (
                          <div className="w-5 h-5 flex items-center justify-center">
                            <span className="text-gray-500 text-xl font-bold">−</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {status === 'incorrect' && compensated ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <span className="text-zinc-600">−</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-zinc-400 text-sm">
                        <div className="flex flex-col gap-1">
                          <span>O: ${item.open.toFixed(2)}</span>
                          <span>H: ${item.high.toFixed(2)}</span>
                          <span>L: ${item.low.toFixed(2)}</span>
                          <span>C: ${item.close.toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}









