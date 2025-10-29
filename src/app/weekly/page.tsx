'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import AttractiveChartSection from '@/components/trading/AttractiveChartSection'
import AttractivePriceCard from '@/components/trading/AttractivePriceCard'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

type ChartType = 'line' | 'candlestick'

function WeeklyPageContent() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('line')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        // Add cache busting parameter to force fresh data
        const response = await fetch(`/api/bars/weekly?t=${Date.now()}&r=${Math.random()}`)
        const result = await response.json()
        console.log('Fetched weekly data:', result)
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

  // Display ALL bars from the JSON file (removed .slice(-50) limit)
  const rows = data.bars || []
  const chartData = rows.map((bar: any) => ({
    time: new Date(bar.t).toLocaleDateString(),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v || 0
  }))

  // Calculate price change
  const currentPrice = rows[rows.length - 1]?.c || 0
  const previousPrice = rows[rows.length - 2]?.c || 0
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0

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
            Weekly Market Analysis
          </h1>
          <p className="text-gray-300 text-lg">SPY Weekly OHLC Data & Trading Signals</p>
        </motion.div>

        {/* Price Card - Top Right (matching daily page position) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
        >
          {/* Empty left space (2 cols) */}
          <div className="lg:col-span-2"></div>

          {/* Right Column - SPY Weekly OHLC */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="w-full"
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
          </div>
        </motion.div>

        {/* Weekly Price Chart - Full Width Below for More Room */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full mb-8"
        >
          <AttractiveChartSection
            data={chartData}
            chartType={chartType}
            onChartTypeChange={setChartType}
            title="Price Chart"
            height={544}
          />
        </motion.div>
      </div>
    </div>
  )
}

export default function WeeklyPage() {
  return (
    <ProtectedRoute>
      <WeeklyPageContent />
    </ProtectedRoute>
  )
}
