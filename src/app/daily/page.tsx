'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import AttractivePriceCard from '@/components/trading/AttractivePriceCard'
import AttractiveChartSection from '@/components/trading/AttractiveChartSection'
import DailyTiers from '@/components/trading/DailyTiers'
import EconomicCalendarInvesting from '@/components/trading/EconomicCalendarInvesting'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

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

  // Calculate price change vs last trading day's close (similar to iOS implementation)
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
            AI-Powered Market Forecast
          </h1>
          <p className="text-gray-300 text-lg">Machine learning predictions calculated at market open • Your competitive edge awaits</p>
        </motion.div>

        {/* Main Layout: Left Column (Trading Signals + Chart) and Right Column (Economic Calendar) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Left Column - Stacked */}
          <div className="lg:col-span-2 space-y-4">
            {/* Trading Signals - Top Left */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-2 border-zinc-800/50 p-6 backdrop-blur-sm">
              <DailyTiers ticker="SPY" />
            </div>

            {/* Price Chart - Bottom Left */}
            <div>
              <AttractiveChartSection
                data={chartData}
                chartType={chartType}
                onChartTypeChange={setChartType}
                title="Price Chart"
              />
            </div>
          </div>

          {/* Right Column - SPY Daily OHLC + Economic Calendar */}
          <div className="lg:col-span-1 space-y-4">
            {/* SPY Daily OHLC - Top Right */}
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

            {/* Economic Calendar - Bottom Right */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-zinc-800 p-6 h-full">
              <EconomicCalendarInvesting />
            </div>
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

