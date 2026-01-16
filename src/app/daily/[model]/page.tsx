'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'motion/react'
import { useParams, useRouter } from 'next/navigation'
import AttractivePriceCard from '@/components/trading/AttractivePriceCard'
import AttractiveChartSection from '@/components/trading/AttractiveChartSection'
import DailyTiers from '@/components/trading/DailyTiers'
import Model2Signals from '@/components/trading/Model2Signals'
import Model2Chart from '@/components/trading/Model2Chart'
import EconomicCalendarInvesting from '@/components/trading/EconomicCalendarInvesting'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

type ChartType = 'line' | 'candlestick'
type ModelType = 'model1' | 'model2'

function DailyPageContent() {
  const params = useParams()
  const router = useRouter()
  const modelParam = params?.model as string
  const selectedModel = (modelParam === 'model2' ? 'model2' : 'model1') as ModelType
  const [data, setData] = useState<any>(null)
  const [model2Data, setModel2Data] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [model2Loading, setModel2Loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('line')
  const [model2ChartType, setModel2ChartType] = useState<ChartType>('candlestick')
  const [refreshKey, setRefreshKey] = useState(0)

  // Redirect invalid model params
  useEffect(() => {
    if (modelParam && modelParam !== 'model1' && modelParam !== 'model2') {
      router.replace('/daily/model1')
    }
  }, [modelParam, router])

  // Fetch Model1 data
  useEffect(() => {
    if (selectedModel !== 'model1') return
    
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/bars/daily?t=${Date.now()}&r=${Math.random()}`)
        const result = await response.json()
        console.log('Fetched Model1 data:', result)
        setData(result)
        setError(null)
      } catch (err) {
        console.error('Error fetching Model1 data:', err)
        setError('Failed to load Model1 data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [refreshKey, selectedModel])

  // Fetch Model2 data
  useEffect(() => {
    if (selectedModel !== 'model2') return
    
    async function fetchModel2Data() {
      try {
        setModel2Loading(true)
        const response = await fetch(`/api/model2/daily?t=${Date.now()}`)
        const result = await response.json()
        console.log('Fetched Model2 data:', result)
        setModel2Data(result)
        setError(null)
      } catch (err) {
        console.error('Error fetching Model2 data:', err)
        setError('Failed to load Model2 data')
      } finally {
        setModel2Loading(false)
      }
    }
    fetchModel2Data()
  }, [selectedModel])

  const isLoading = selectedModel === 'model1' ? loading : model2Loading

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="text-center text-red-600">{error}</div>
      </main>
    )
  }

  if (selectedModel === 'model1' && !data) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="text-center text-red-600">No Model1 data available</div>
      </main>
    )
  }

  if (selectedModel === 'model2' && !model2Data) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="text-center text-red-600">No Model2 data available</div>
      </main>
    )
  }

  // Model1 chart data
  const rows = selectedModel === 'model1' ? (data?.bars?.slice(-50) || []) : []
  const chartData = rows.map((bar: any) => ({
    time: new Date(bar.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v || 0
  }))

  // Calculate price change vs previous trading day's close (Model1 only)
  // Match app logic: filter to regular market hours (9:30 AM - 3:00 PM ET) only
  const allBars = selectedModel === 'model1' ? (data?.bars || []) : []
  const nyTZ = 'America/New_York'
  
  // Helper function to get hour and minute in ET timezone
  // Timestamps are already in ET format (e.g., "2025-11-24T15:45:00" = 3:45 PM ET)
  // Swift parses them with timezone set to ET, so we extract hour/minute directly
  const getETTimeComponents = (timestamp: string): { hour: number; minute: number; date: Date } => {
    // Extract hour and minute directly from timestamp string (they're already in ET)
    const [, timePart] = timestamp.split('T')
    const [hour, minute] = timePart.split(':').map(Number)
    
    // For date comparisons, we need a Date object
    // Parse timestamp assuming it's ET, then create Date
    // Since JS parses as UTC by default, we need to adjust
    const [datePart] = timestamp.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    
    // Create date in UTC, but we'll use it for date comparisons only
    // The actual time components (hour/minute) come from the string
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
    
    return { hour, minute, date }
  }
  
  // Helper function to check if a bar is in regular market hours (9:30 AM - 3:00 PM ET)
  const isRegularMarketHours = (bar: any): boolean => {
    const { hour, minute } = getETTimeComponents(bar.t)
    
    // Include bars from 9:30 AM (09:30) to 3:00 PM (15:00) ET
    // Note: hour > 15 means exclude hour 16+, but include hour 15 (3:00 PM to 3:59 PM)
    if (hour < 9 || hour > 15) return false
    if (hour === 9 && minute < 30) return false
    // Include all of hour 15 (3:00 PM to 3:59 PM) for 15-minute bars
    return true
  }
  
  // Filter all bars to regular market hours only
  const regularHoursBars = allBars.filter(isRegularMarketHours)
  
  if (regularHoursBars.length === 0) {
    // Fallback: if no regular hours bars, use all bars (shouldn't happen normally)
    console.warn('No regular market hours bars found, using all bars')
  }
  
  // Sort filtered bars by timestamp
  const sortedRegularBars = (regularHoursBars.length > 0 ? regularHoursBars : allBars)
    .sort((a: any, b: any) => new Date(a.t).getTime() - new Date(b.t).getTime())
  
  // Get the last regular-hours bar for current price
  const currentBar = sortedRegularBars[sortedRegularBars.length - 1]
  const currentPrice = currentBar?.c || 0
  
  if (!currentBar) {
    // No data available
    console.warn('No current bar found for price calculation')
  }
  
  // Get the current bar's trading day (ET timezone)
  // Since timestamps are in ET format, extract date part directly
  const getETDateString = (timestamp: string): string => {
    // Timestamp format: "2025-11-24T15:45:00", date part is already in ET
    const [datePart] = timestamp.split('T')
    return datePart // Returns YYYY-MM-DD format
  }
  
  const currentDateStr = currentBar ? getETDateString(currentBar.t) : getETDateString(new Date().toISOString())
  
  // Group regular-hours bars by trading day (date in ET timezone)
  const barsByDate = new Map<string, any[]>()
  
  sortedRegularBars.forEach((bar: any) => {
    const barDateStr = getETDateString(bar.t)
    
    if (!barsByDate.has(barDateStr)) {
      barsByDate.set(barDateStr, [])
    }
    barsByDate.get(barDateStr)!.push(bar)
  })
  
  // Get all unique dates and sort them
  const sortedDates = Array.from(barsByDate.keys()).sort()
  
  // Find the previous trading day's close (last regular-hours bar from previous day)
  let previousClose = 0
  const currentDateIndex = sortedDates.indexOf(currentDateStr)
  if (currentDateIndex > 0) {
    // Get the previous trading day's date
    const previousDateStr = sortedDates[currentDateIndex - 1]
    const previousDayBars = barsByDate.get(previousDateStr) || []
    
    if (previousDayBars.length > 0) {
      // All bars in previousDayBars are already from regular hours
      // Use the last bar from the previous day as the close
      const sortedPreviousBars = previousDayBars.sort((a: any, b: any) => 
        new Date(a.t).getTime() - new Date(b.t).getTime()
      )
      const previousCloseBar = sortedPreviousBars[sortedPreviousBars.length - 1]
      previousClose = previousCloseBar?.c || 0
    }
  }
  
  // Calculate change vs previous trading day's close
  const priceChange = currentPrice - previousClose
  const priceChangePercent = previousClose ? (priceChange / previousClose) * 100 : 0
  
  // Debug logging
  if (previousClose > 0) {
    console.log('Price calculation debug:', {
      currentDate: currentDateStr,
      currentBar: currentBar ? {
        timestamp: currentBar.t,
        close: currentBar.c
      } : null,
      currentPrice,
      previousClose,
      priceChange,
      priceChangePercent: priceChangePercent.toFixed(2) + '%'
    })
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
            AI-Powered Market Forecast
          </h1>
          <p className="text-gray-300 text-lg mb-4">Signals publish near the opening bell, stay fixed all session, and are built for today—with an occasional carry into tomorrow.</p>
        </motion.div>

        {/* Main Layout: Left Column (Trading Signals + Chart) and Right Column (Economic Calendar) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Left Column - Stacked */}
          <div className={`${selectedModel === 'model2' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
            {/* Trading Signals - Top Left */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-2 border-zinc-800/50 p-6 backdrop-blur-sm">
              {selectedModel === 'model1' ? (
                <DailyTiers ticker="SPY" />
              ) : (
                <Model2Signals ticker="SPY" />
              )}
            </div>

            {/* Price Chart - Bottom Left */}
            <div>
              {selectedModel === 'model1' ? (
                <AttractiveChartSection
                  data={chartData}
                  chartType={chartType}
                  onChartTypeChange={setChartType}
                  title="Price Chart"
                />
              ) : (
                <Model2Chart
                  tradingDays={model2Data?.trading_days || []}
                  height={400}
                  chartType={model2ChartType}
                  onChartTypeChange={setModel2ChartType}
                />
              )}
            </div>
          </div>

          {/* Right Column - SPY Daily OHLC + Economic Calendar (Model1 only) */}
          {selectedModel === 'model1' && (
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* SPY Daily OHLC - Top Right (Model1 only) */}
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

            {/* Economic Calendar - Bottom Right (Model1 only) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-zinc-800 p-6 flex-1 flex flex-col">
              <EconomicCalendarInvesting />
            </div>
          </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function DailyModelPage() {
  return (
    <ProtectedRoute requireSubscription>
      <Suspense fallback={
        <main className="mx-auto max-w-6xl p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </main>
      }>
        <DailyPageContent />
      </Suspense>
    </ProtectedRoute>
  )
}
