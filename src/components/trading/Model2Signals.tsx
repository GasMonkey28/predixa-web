'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { TrendingUp, TrendingDown, Zap, Sparkles, Info, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react'

interface Model2Data {
  metadata: {
    generated_at: string
    date_range: { start: string; end: string }
    total_days: number
  }
  today: {
    date: string
    final_signal: string
    position_size: number
    y1_signal: string
    y2y3_signal: string
    pred_y1: number
    pred_y2_plus_y3: number
  }
  settings: Record<string, any>
  trading_days?: any[]
}

interface Model2SignalsProps {
  ticker?: string
}

export default function Model2Signals({ ticker = 'SPY' }: Model2SignalsProps) {
  const [data, setData] = useState<Model2Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/model2/daily?t=${Date.now()}`)
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch Model2 data')
        }
        
        // If today is missing but we have trading_days, extract from last day
        if (!result.today && result.trading_days && result.trading_days.length > 0) {
          const lastDay = result.trading_days[result.trading_days.length - 1]
          if (lastDay.as_of_date) {
            result.today = {
              date: lastDay.as_of_date,
              final_signal: lastDay.final_signal || 'no_trade',
              position_size: lastDay.position_size || 0,
              y1_signal: lastDay.y1_signal || 'no_trade',
              y2y3_signal: lastDay.y2y3_signal || 'no_trade',
              pred_y1: lastDay.pred_y1 || 0,
              pred_y2_plus_y3: lastDay.pred_y2_plus_y3 || 0
            }
            console.log('Extracted today data from last trading day:', result.today)
          }
        }
        
        console.log('Model2 data received:', {
          hasToday: !!result.today,
          today: result.today,
          tradingDaysCount: result.trading_days?.length || 0,
          isFallback: result.fallback,
          error: result.error,
          fullData: result
        })
        
        // Debug: Check if today data exists
        if (result.fallback) {
          console.error('❌ Model2 API returned fallback data. Error:', result.error)
          console.error('⚠️ This usually means S3 bucket policy needs to allow public read access to model2_y2y3/*')
          console.error('📋 See S3_POLICY_UPDATE_MODEL2.md for instructions')
        }
        
        if (!result.today || !result.today.final_signal) {
          console.warn('⚠️ Today data missing or incomplete:', result.today)
          if (result.trading_days && result.trading_days.length > 0) {
            console.log('📊 Last trading day:', result.trading_days[result.trading_days.length - 1])
          }
        }
        
        setData(result)
      } catch (err) {
        console.error('Error fetching Model2 data:', err)
        setError('Failed to load Model2 data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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

  if (error || !data) {
    return (
      <div className="text-center text-red-600 dark:text-red-400">{error || 'No Model2 data available'}</div>
    )
  }

  const { today, metadata } = data
  const finalSignal = today.final_signal || 'no_trade'
  const isLong = finalSignal === 'long'
  const isShort = finalSignal === 'short'
  const isNoTrade = finalSignal === 'no_trade'

  // Format predictions
  const formatPrediction = (val: number) => {
    return val >= 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <p className="text-xs text-gray-400">Model2 HighLowSingle • ML predictions at market open</p>
          </div>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative group"
        >
          <div className="px-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700">
            <div className="text-xs text-gray-400 mb-1">Updated</div>
            <div className="text-sm text-white font-semibold">{today.date}</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Final Signal Banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={finalSignal}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className={`relative overflow-hidden rounded-2xl p-6 mb-6 ${
            isLong
              ? 'bg-gradient-to-r from-emerald-900/40 via-green-900/30 to-emerald-900/40 border-2 border-emerald-500/30'
              : isShort
                ? 'bg-gradient-to-r from-red-900/40 via-rose-900/30 to-red-900/40 border-2 border-red-500/30'
                : 'bg-gradient-to-r from-zinc-900/40 via-gray-900/30 to-zinc-900/40 border-2 border-zinc-500/30'
          }`}
        >
          <motion.div
            className={`absolute inset-0 ${
              isLong ? 'bg-emerald-500' : isShort ? 'bg-red-500' : 'bg-zinc-500'
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
                {isLong ? (
                  <ArrowUpRight className="w-8 h-8 text-green-400" />
                ) : isShort ? (
                  <ArrowDownRight className="w-8 h-8 text-rose-400" />
                ) : (
                  <Info className="w-8 h-8 text-zinc-300" />
                )}
              </motion.div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Final Signal</div>
                <div className={`text-2xl font-bold ${
                  isLong ? 'text-green-400' : isShort ? 'text-rose-400' : 'text-zinc-300'
                }`}>
                  {finalSignal.toUpperCase()}
                </div>
                <div className="text-sm text-gray-300">
                  Position Size: {today.position_size > 0 ? `+${today.position_size}` : today.position_size}
                </div>
              </div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`px-6 py-3 rounded-xl bg-gradient-to-r ${
                isLong 
                  ? 'from-emerald-600 via-green-500 to-emerald-600' 
                  : isShort 
                    ? 'from-red-600 via-rose-500 to-red-600'
                    : 'from-zinc-700 via-gray-700 to-zinc-700'
              } shadow-2xl`}
            >
              <div className="text-2xl font-bold text-white">
                {today.position_size > 0 ? `+${today.position_size}` : today.position_size}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Signal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Y1 Signal */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-950/80 to-zinc-900/90 border-2 border-blue-500/30 p-6"
        >
          <motion.div
            className="absolute inset-0 bg-blue-500 opacity-30 blur-3xl"
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
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                <div>
                  <span className="text-lg font-bold text-white block">Y1 Signal</span>
                  <span className="text-xs text-blue-300">Prediction Signal</span>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`px-4 py-2 rounded-xl ${
                  today.y1_signal === 'long'
                    ? 'bg-gradient-to-r from-emerald-600 to-green-500'
                    : today.y1_signal === 'short'
                      ? 'bg-gradient-to-r from-red-600 to-rose-500'
                      : 'bg-gradient-to-r from-zinc-700 to-gray-600'
                } shadow-xl`}
              >
                <span className="text-xl font-black text-white">
                  {today.y1_signal.toUpperCase() || 'N/A'}
                </span>
              </motion.div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <span className="text-sm text-gray-400">Pred Y1</span>
                <span className={`text-lg font-bold ${
                  today.pred_y1 >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPrediction(today.pred_y1)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Y2Y3 Signal */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-950/80 to-zinc-900/90 border-2 border-purple-500/30 p-6"
        >
          <motion.div
            className="absolute inset-0 bg-purple-500 opacity-30 blur-3xl"
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
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                <div>
                  <span className="text-lg font-bold text-white block">Y2Y3 Signal</span>
                  <span className="text-xs text-purple-300">Combined Prediction</span>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                className={`px-4 py-2 rounded-xl ${
                  today.y2y3_signal === 'long'
                    ? 'bg-gradient-to-r from-emerald-600 to-green-500'
                    : today.y2y3_signal === 'short'
                      ? 'bg-gradient-to-r from-red-600 to-rose-500'
                      : 'bg-gradient-to-r from-zinc-700 to-gray-600'
                } shadow-xl`}
              >
                <span className="text-xl font-black text-white">
                  {today.y2y3_signal.toUpperCase() || 'N/A'}
                </span>
              </motion.div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <span className="text-sm text-gray-400">Pred Y2+Y3</span>
                <span className={`text-lg font-bold ${
                  today.pred_y2_plus_y3 >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPrediction(today.pred_y2_plus_y3)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Metadata */}
      {metadata && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-indigo-900/40 border border-indigo-500/30 p-4"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <Info className="w-5 h-5" />
              <span className="text-xs font-semibold">Data Range</span>
            </div>
            <div className="text-indigo-200 text-sm">
              {metadata.date_range.start} to {metadata.date_range.end} ({metadata.total_days} days)
            </div>
            <div className="text-indigo-300/80 text-xs mt-1">
              Generated: {new Date(metadata.generated_at).toLocaleString()}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
