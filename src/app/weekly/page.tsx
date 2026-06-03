'use client'

import { motion } from 'motion/react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import WeeklyPriceChartSection from '@/components/trading/WeeklyPriceChartSection'

export const dynamic = 'force-dynamic'

function WeeklyPageContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse" />
      <div className="relative mx-auto max-w-7xl p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Weekly Market Analysis
          </h1>
          <p className="text-gray-300 text-lg">SPY Weekly OHLC Data & Trading Signals</p>
        </motion.div>

        <WeeklyPriceChartSection showPriceCard chartHeight={544} className="mb-8" />
      </div>
    </div>
  )
}

export default function WeeklyPage() {
  return (
    <ProtectedRoute requireSubscription>
      <WeeklyPageContent />
    </ProtectedRoute>
  )
}
