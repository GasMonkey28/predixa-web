'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import AttractivePriceCard from '@/components/trading/AttractivePriceCard'
import AttractiveRecommendationCard from '@/components/trading/AttractiveRecommendationCard'
import AttractiveChartSection from '@/components/trading/AttractiveChartSection'
import DailyTiers from '@/components/trading/DailyTiers'
import EconomicCalendar from '@/components/trading/EconomicCalendar'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { generateRecommendation } from '@/lib/technical-indicators'

type ChartType = 'line' | 'candlestick'

function DailyPageContent() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('line')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        // Add cache busting parameter to force fresh data
        const response = await fetch(`/api/bars/daily?t=${Date.now()}&r=${Math.random()}`)
        const result = await response.json()
        console.log('Fetched data:', result)
        console.log('Bars count:', result.bars?.length)
        console.log('First bar:', result.bars?.[0])
        console.log('Last bar:', result.bars?.[result.bars?.length - 1])
        setData(result)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [refreshKey])

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="text-center text-red-600">{error || 'No data available'}</div>
      </main>
    )
  }

  const rows = data.bars?.slice(-50) || []
  const chartData = rows.map((bar: any) => ({
    time: new Date(bar.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v || 0
  }))

  // Calculate basic statistics
  const currentPrice = rows[rows.length - 1]?.c || 0
  const previousPrice = rows[rows.length - 2]?.c || 0
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0

  // Generate recommendation based on current data
  const recommendation = generateRecommendation(rows)

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
            Daily Market Analysis
          </h1>
          <p className="text-gray-300 text-lg">Professional trading insights powered by real-time data</p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Price Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <AttractivePriceCard
              price={currentPrice}
              change={priceChange}
              changePercent={priceChangePercent}
              onRefresh={() => {
                setRefreshKey(prev => prev + 1)
                setLoading(true)
              }}
            />
          </motion.div>

          {/* Recommendation Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <AttractiveRecommendationCard recommendation={recommendation} />
          </motion.div>
        </div>

        {/* Chart Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <AttractiveChartSection
            data={chartData}
            chartType={chartType}
            onChartTypeChange={setChartType}
          />
        </motion.div>


        {/* Legacy Trading Signals Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Legacy Trading Signals</h3>
            <DailyTiers ticker="SPY" />
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Legacy Economic Calendar</h3>
            <EconomicCalendar minImpact={2} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function DailyPage() {
  return (
    <ProtectedRoute>
      <DailyPageContent />
    </ProtectedRoute>
  )
}

