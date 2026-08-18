'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import AttractiveChartSection from '@/components/trading/AttractiveChartSection'
import AttractivePriceCard from '@/components/trading/AttractivePriceCard'
import AutoRefreshControls from '@/components/ui/AutoRefreshControls'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

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
  nextWeek: WeeklyPrediction | null
  allWeeks?: WeeklyPrediction[]
  publishReady?: boolean
}

interface WeeklyPriceChartSectionProps {
  /** Show price card above the chart (weekly page layout) */
  showPriceCard?: boolean
  chartHeight?: number
  className?: string
  /** Ticker to chart (defaults to SPY, matching original single-ticker behavior) */
  ticker?: string
  /**
   * Initial bar interval. Defaults to '15min' (unchanged SPY behavior). Tickers that only
   * have a 60min S3 feed set up (no 15min schedule yet, e.g. a newly-added ticker) should
   * pass '60min' here so the first load doesn't 404 against a bars/{ticker}/15min/ key that
   * doesn't exist.
   */
  defaultInterval?: '15min' | '60min'
}

export default function WeeklyPriceChartSection({
  showPriceCard = false,
  chartHeight = 544,
  className = '',
  ticker = 'SPY',
  defaultInterval = '15min',
}: WeeklyPriceChartSectionProps) {
  const [data, setData] = useState<{ bars?: Array<{ t: string; o: number; h: number; l: number; c: number; v?: number }> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('line')
  const [barInterval, setBarInterval] = useState<'15min' | '60min'>(defaultInterval)
  const [weeklyPredictions, setWeeklyPredictions] = useState<WeeklyPredictions>({
    currentWeek: null,
    previousWeek: null,
    nextWeek: null,
  })

  const fetchData = useCallback(
    async (opts?: { soft?: boolean }) => {
      const soft = opts?.soft === true
      try {
        if (soft) setRefreshing(true)
        else {
          setLoading(true)
          setError(null)
        }
        const barsResponse = await fetch(
          `/api/bars/weekly?interval=${barInterval}&ticker=${ticker}&t=${Date.now()}&r=${Math.random()}`
        )
        const barsResult = await barsResponse.json()
        setData(barsResult)

        let predictionsUrl = `/api/weekly-predictions?ticker=${ticker}&t=${Date.now()}&r=${Math.random()}`
        if (barInterval === '60min' && barsResult.bars?.length > 0) {
          const firstBar = barsResult.bars[0]
          const lastBar = barsResult.bars[barsResult.bars.length - 1]
          const startDate = firstBar.t ? firstBar.t.split('T')[0] : null
          const endDate = lastBar.t ? lastBar.t.split('T')[0] : null
          if (startDate && endDate) {
            predictionsUrl += `&interval=60min&startDate=${startDate}&endDate=${endDate}`
          }
        }

        const predictionsResponse = await fetch(predictionsUrl)
        const predictionsResult = await predictionsResponse.json()
        setWeeklyPredictions({
          currentWeek: predictionsResult.currentWeek,
          previousWeek: predictionsResult.previousWeek,
          nextWeek: predictionsResult.nextWeek ?? null,
          allWeeks: predictionsResult.allWeeks || undefined,
          publishReady: predictionsResult.publishReady,
        })
        setError(null)
      } catch {
        setError('Failed to load chart data')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [barInterval, ticker]
  )

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const softRefresh = useCallback(() => {
    void fetchData({ soft: true })
  }, [fetchData])

  const { autoRefresh, setAutoRefresh, intervalMs } = useAutoRefresh(softRefresh)

  if (loading && !data) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !data?.bars?.length) {
    return (
      <p className={`text-red-400 text-sm text-center py-8 ${className}`}>
        {error || 'Chart data unavailable.'}
      </p>
    )
  }

  const rows = data.bars
  const chartData = rows.map((bar) => ({
    time: new Date(bar.t).toLocaleDateString(),
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v || 0,
  }))

  const nyTZ = 'America/New_York'
  const allBars = data.bars
  const regularHoursBars = allBars
    .map((bar) => ({ ...bar, date: new Date(bar.t) }))
    .filter((bar) => {
      const etTime = new Date(bar.date.toLocaleString('en-US', { timeZone: nyTZ }))
      const hour = etTime.getHours()
      const minute = etTime.getMinutes()
      if (hour < 9 || hour > 16) return false
      if (hour === 9 && minute < 30) return false
      if (hour === 16 && minute > 0) return false
      return true
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const currentBar = regularHoursBars[regularHoursBars.length - 1]
  const currentPrice = currentBar?.c || 0

  let previousClose = 0
  if (currentBar) {
    const latestBar = allBars[allBars.length - 1]
    const latestDateET = new Date(new Date(latestBar.t).toLocaleString('en-US', { timeZone: nyTZ }))
    const currentDateStr = latestDateET.toISOString().split('T')[0]

    const previousDayBars = allBars.filter((bar) => {
      const barDateET = new Date(new Date(bar.t).toLocaleString('en-US', { timeZone: nyTZ }))
      return barDateET.toISOString().split('T')[0] < currentDateStr
    })

    const previousCloseBars = previousDayBars.filter((bar) => bar.t?.includes('T15:45:00'))
    const previousCloseBar =
      previousCloseBars.length > 0
        ? previousCloseBars[previousCloseBars.length - 1]
        : previousDayBars[previousDayBars.length - 1]
    previousClose = previousCloseBar?.c || 0
  }

  const priceChange = currentPrice - previousClose
  const priceChangePercent = previousClose ? (priceChange / previousClose) * 100 : 0

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <AutoRefreshControls
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          intervalMs={intervalMs}
          onRefresh={softRefresh}
          refreshing={refreshing || loading}
        />
        {refreshing && <span className="text-xs text-blue-300">Updating…</span>}
      </div>
      {showPriceCard && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
        >
          <div className="lg:col-span-2" />
          <div className="lg:col-span-1">
            <AttractivePriceCard
              price={currentPrice}
              change={priceChange}
              changePercent={priceChangePercent}
              onRefresh={softRefresh}
              ticker={ticker}
            />
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <AttractiveChartSection
          data={chartData}
          chartType={chartType}
          onChartTypeChange={setChartType}
          title="Weekly price chart"
          height={chartHeight}
          weeklyPredictions={weeklyPredictions}
          interval={barInterval}
          onIntervalChange={setBarInterval}
        />
      </motion.div>
    </div>
  )
}
