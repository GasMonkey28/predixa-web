'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import AttractiveChartSection from '@/components/trading/AttractiveChartSection'
import AttractivePriceCard from '@/components/trading/AttractivePriceCard'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// Force dynamic rendering - this page uses client-side hooks and cannot be statically generated
export const dynamic = 'force-dynamic'

type ChartType = 'line' | 'candlestick'

interface WeeklyPrediction {
  ticker: string
  as_of_date: string
  fwd_join_date: string
  baseline_week_close: number
  t_close_to_pre: number
  t_lowest_to_close: number
  t_highest_to_pre: number
}

interface WeeklyPredictions {
  currentWeek: WeeklyPrediction | null
  previousWeek: WeeklyPrediction | null
  allWeeks?: WeeklyPrediction[]
}

function WeeklyPageContent() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('line')
  const [interval, setInterval] = useState<'15min' | '60min'>('15min')
  const [refreshKey, setRefreshKey] = useState(0)
  const [weeklyPredictions, setWeeklyPredictions] = useState<WeeklyPredictions>({
    currentWeek: null,
    previousWeek: null,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Fetch bars data first to get date range
        const barsResponse = await fetch(`/api/bars/weekly?interval=${interval}&t=${Date.now()}&r=${Math.random()}`)
        const barsResult = await barsResponse.json()
        console.log('Fetched weekly data:', barsResult)
        console.log('Bars count:', barsResult.bars?.length)
        console.log('First bar:', barsResult.bars?.[0])
        console.log('Last bar:', barsResult.bars?.[barsResult.bars?.length - 1])
        setData(barsResult)
        
        // Calculate date range from bars for 60min interval
        let predictionsUrl = `/api/weekly-predictions?t=${Date.now()}&r=${Math.random()}`
        if (interval === '60min' && barsResult.bars && barsResult.bars.length > 0) {
          const firstBar = barsResult.bars[0]
          const lastBar = barsResult.bars[barsResult.bars.length - 1]
          // Extract date part from timestamps (format: "2025-09-18T09:30:00")
          const startDate = firstBar.t ? firstBar.t.split('T')[0] : null
          const endDate = lastBar.t ? lastBar.t.split('T')[0] : null
          if (startDate && endDate) {
            predictionsUrl += `&interval=60min&startDate=${startDate}&endDate=${endDate}`
          }
        }
        
        // Fetch predictions with date range if 60min
        const predictionsResponse = await fetch(predictionsUrl)
        const predictionsResult = await predictionsResponse.json()
        console.log('Fetched weekly predictions:', predictionsResult)
        setWeeklyPredictions({
          currentWeek: predictionsResult.currentWeek,
          previousWeek: predictionsResult.previousWeek,
          allWeeks: predictionsResult.allWeeks || undefined,
        })
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [refreshKey, interval])

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
    timestamp: bar.t, // Keep original timestamp for date comparisons
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v || 0
  }))

  // Calculate price change vs last trading day's close (same logic as daily page)
  const allBars = data.bars || []
  
  // Filter to only regular market hours (9:30 AM - 4:00 PM ET) and sort by date
  const nyTZ = 'America/New_York'
  const regularHoursBars = allBars
    .map((bar: any) => ({
      ...bar,
      date: new Date(bar.t)
    }))
    .filter((bar: any) => {
      // Convert to ET for filtering
      const etTime = new Date(bar.date.toLocaleString('en-US', { timeZone: nyTZ }))
      const hour = etTime.getHours()
      const minute = etTime.getMinutes()
      
      // Include bars from 9:30 AM (09:30) to 4:00 PM (16:00) ET
      if (hour < 9 || hour > 16) return false
      if (hour === 9 && minute < 30) return false
      if (hour === 16 && minute > 0) return false
      return true
    })
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())

  // Get current bar (last one in regular hours)
  const currentBar = regularHoursBars[regularHoursBars.length - 1]
  const currentPrice = currentBar?.c || 0
  
  // Get the current bar's trading day start (ET timezone)
  let previousClose = 0
  if (currentBar) {
    // Get the latest bar from all bars to determine the current trading day
    // This ensures we use the most recent data point, not just the filtered regular hours
    const latestBar = allBars[allBars.length - 1]
    const latestBarDate = new Date(latestBar.t)
    const latestDateET = new Date(latestBarDate.toLocaleString('en-US', { timeZone: nyTZ }))
    const currentDateStr = latestDateET.toISOString().split('T')[0] // YYYY-MM-DD
    
    // Find the previous trading day's 4:00 PM ET close price
    // Look for the bar with timestamp T15:45:00 (3:45-4:00 PM bar, closes at 4:00 PM) from previous trading day
    const previousDayBars = allBars.filter((bar: any) => {
      const barDate = new Date(bar.t)
      const barDateET = new Date(barDate.toLocaleString('en-US', { timeZone: nyTZ }))
      const barDateStr = barDateET.toISOString().split('T')[0] // YYYY-MM-DD
      return barDateStr < currentDateStr
    })
    
    // Find the specific 4:00 PM close bar (T15:45:00) from the previous trading day
    // This is the 15-minute bar from 3:45 PM to 4:00 PM, which closes at 4:00 PM
    // Find all T15:45:00 bars from previous days and take the last one (most recent previous trading day)
    const previousCloseBars = previousDayBars.filter((bar: any) => {
      // Check if the timestamp contains T15:45:00 (the 4:00 PM close bar)
      return bar.t && bar.t.includes('T15:45:00')
    })
    
    // Use the last T15:45:00 bar (most recent previous trading day's 4 PM close)
    // If no T15:45:00 bar found, fall back to the last bar from previous day
    const previousCloseBar = previousCloseBars.length > 0 
      ? previousCloseBars[previousCloseBars.length - 1]
      : previousDayBars[previousDayBars.length - 1]
    previousClose = previousCloseBar?.c || 0
  }
  
  // Calculate change vs previous trading day's close
  const priceChange = currentPrice - previousClose
  const priceChangePercent = previousClose ? (priceChange / previousClose) * 100 : 0

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
            weeklyPredictions={weeklyPredictions}
            interval={interval}
            onIntervalChange={setInterval}
          />
        </motion.div>
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
