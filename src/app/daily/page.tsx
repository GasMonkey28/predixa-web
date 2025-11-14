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

  // Get current bar (last one in regular hours) - this is today's 4:00 PM close after market closes
  const currentBar = regularHoursBars[regularHoursBars.length - 1]
  const currentPrice = currentBar?.c || 0
  
  // Calculate previous trading day's close
  // We need to find the last bar from regular hours of the previous trading day
  let previousClose = 0
  if (currentBar && regularHoursBars.length > 0) {
    // Get the current trading day date (ET timezone)
    const currentBarDate = new Date(currentBar.t)
    const currentBarDateET = new Date(currentBarDate.toLocaleString('en-US', { timeZone: nyTZ }))
    const currentDateStr = currentBarDateET.toISOString().split('T')[0] // YYYY-MM-DD
    
    // Filter bars to only regular market hours, then group by date
    // This ensures we get the 4:00 PM close from the previous trading day
    const barsByDate = new Map<string, any[]>()
    
    regularHoursBars.forEach((bar: any) => {
      const barDate = new Date(bar.t)
      const barDateET = new Date(barDate.toLocaleString('en-US', { timeZone: nyTZ }))
      const barDateStr = barDateET.toISOString().split('T')[0] // YYYY-MM-DD
      
      if (!barsByDate.has(barDateStr)) {
        barsByDate.set(barDateStr, [])
      }
      barsByDate.get(barDateStr)!.push(bar)
    })
    
    // Get all unique dates and sort them
    const sortedDates = Array.from(barsByDate.keys()).sort()
    
    // Find the previous trading day (the date before today)
    const currentDateIndex = sortedDates.indexOf(currentDateStr)
    if (currentDateIndex > 0) {
      // Get the previous trading day's date
      const previousDateStr = sortedDates[currentDateIndex - 1]
      const previousDayBars = barsByDate.get(previousDateStr) || []
      
      // Get the last bar from the previous trading day (the 4:00 PM close)
      if (previousDayBars.length > 0) {
        // Sort by time to ensure we get the last bar of the day
        const sortedPreviousBars = previousDayBars.sort((a: any, b: any) => 
          new Date(a.t).getTime() - new Date(b.t).getTime()
        )
        const previousCloseBar = sortedPreviousBars[sortedPreviousBars.length - 1]
        previousClose = previousCloseBar?.c || 0
      }
    }
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
          <p className="text-gray-300 text-lg">Signals publish near the opening bell, stay fixed all session, and are built for today—with an occasional carry into tomorrow.</p>
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
          <div className="lg:col-span-1 flex flex-col gap-4">
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-zinc-800 p-6 flex-1 flex flex-col">
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
    <ProtectedRoute requireSubscription>
      <DailyPageContent />
    </ProtectedRoute>
  )
}

