'use client'

import { useState, useEffect } from 'react'
import BubblesChart from '@/components/options/BubblesChart'
import DeltaBarsChart from '@/components/options/DeltaBarsChart'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

type ViewMode = 'bubbles' | 'deltaBars'
type TimelineFilter = '1M' | '3M' | '6M' | '1Y' | 'Max'

function nyTodayISO() {
  const now = new Date()
  const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const y = ny.getFullYear()
  const m = String(ny.getMonth() + 1).padStart(2, '0')
  const d = String(ny.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function FuturePageContent() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('deltaBars')
  
  // Bubble filters
  const [minTotal, setMinTotal] = useState(5)
  const [minMaxAbs, setMinMaxAbs] = useState(5)
  const [minAccum, setMinAccum] = useState(1200)
  const [showTotalDiff, setShowTotalDiff] = useState(true)
  const [showAccumulated, setShowAccumulated] = useState(true)
  const [showMaxAbsDiff, setShowMaxAbsDiff] = useState(true)
  const [selectedBubbleMetrics, setSelectedBubbleMetrics] = useState<Array<'total_diff_money' | 'accumulated_money' | 'max_abs_diff_money'>>([
    'total_diff_money',
    'accumulated_money',
    'max_abs_diff_money'
  ])
  
  // Delta bars filters
  const [selectedWindows, setSelectedWindows] = useState<string[]>(['1d', '5d', '20d'])
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('1M')
  const [showBubbleFilters, setShowBubbleFilters] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/future/${nyTodayISO()}`)
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError('Failed to load options data')
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

  if (error || !data) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="text-center text-red-600">{error || 'No options data available'}</div>
      </main>
    )
  }

  // Process data based on your Swift implementation
  const bubbles = data.bubbles || []
  const deltaBars = data.bars || []
  const priceCandles = data.price_candles || []

  const hasBubblesData = (bubbles?.length || 0) > 0
  const hasDeltaBarsData = (deltaBars?.length || 0) > 0

  const formatMoney = (val: number) => {
    const millions = val / 10_000.0
    if (Math.abs(millions) >= 1000) {
      return `$${(millions / 1000).toFixed(1)}B`
    } else {
      return `$${millions.toFixed(1)}M`
    }
  }

  const getMaxExpirationDate = (filter: TimelineFilter): Date | null => {
    const now = new Date()
    switch (filter) {
      case '1M':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
      case '3M':
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
      case '6M':
        return new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
      case '1Y':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      case 'Max':
        return null
    }
  }

  const bubblesForTimeline = (() => {
    const maxDate = getMaxExpirationDate(timelineFilter)
    if (!maxDate) return bubbles
    return bubbles.filter((b: any) => new Date(b.expiration) <= maxDate)
  })()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
      
      <div className="relative mx-auto max-w-7xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Options Flow Analysis</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">SPY Options Flow & Key Levels</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">Date: {nyTodayISO()}</div>
        </div>
      </div>

      {/* View Mode Selector & Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('deltaBars')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'deltaBars'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Flow Timeline
          </button>
          <button
            onClick={() => setViewMode('bubbles')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'bubbles'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Key Levels
          </button>
        </div>
        
        {viewMode === 'deltaBars' && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">Timeline:</span>
            <select
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value as TimelineFilter)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="1M">1 Month</option>
              <option value="3M">3 Months</option>
              <option value="6M">6 Months</option>
              <option value="1Y">1 Year</option>
              <option value="Max">Max</option>
            </select>
            <span className="text-sm text-gray-700 dark:text-gray-300">Windows:</span>
            <div className="flex gap-2">
              {['1d','3d','5d','10d','20d'].map((w) => {
                const active = selectedWindows.includes(w)
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setSelectedWindows(selectedWindows.filter(x => x !== w))
                      } else {
                        setSelectedWindows([...selectedWindows, w])
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {w}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {viewMode === 'bubbles' && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">Timeline:</span>
            <select
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value as TimelineFilter)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="1M">1 Month</option>
              <option value="3M">3 Months</option>
              <option value="6M">6 Months</option>
              <option value="1Y">1 Year</option>
              <option value="Max">Max</option>
            </select>
            <span className="text-sm text-gray-700 dark:text-gray-300">Metrics:</span>
            <div className="flex gap-2">
              {[
                { key: 'total_diff_money', label: 'Total Diff' },
                { key: 'accumulated_money', label: 'Accumulated' },
                { key: 'max_abs_diff_money', label: 'Max Abs Diff' },
              ].map((m: any) => {
                const active = selectedBubbleMetrics.includes(m.key)
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setSelectedBubbleMetrics(selectedBubbleMetrics.filter(x => x !== m.key))
                      } else {
                        setSelectedBubbleMetrics([...selectedBubbleMetrics, m.key])
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowBubbleFilters(true)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Filters
            </button>
          </div>
        )}
      </div>

      {/* Chart Display */}
      <div className="mb-6 rounded-lg border dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-medium dark:text-white mb-4">
          {viewMode === 'bubbles' ? 'Key Levels' : 'Flow Timeline'}
        </h2>
        
        {viewMode === 'bubbles' ? (
          hasBubblesData ? (
            <BubblesChart
              bubbles={bubblesForTimeline}
              priceCandles={priceCandles}
              minTotal={minTotal}
              minMaxAbs={minMaxAbs}
              minAccum={minAccum}
              showTotalDiff={selectedBubbleMetrics.includes('total_diff_money')}
              showAccumulated={selectedBubbleMetrics.includes('accumulated_money')}
              showMaxAbsDiff={selectedBubbleMetrics.includes('max_abs_diff_money')}
            />
          ) : (
            <div className="p-6 rounded-lg border dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-center">
              <div className="text-gray-700 dark:text-gray-300 font-medium">Today&apos;s options data isn&apos;t available yet.</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">We update after market open (ET). Please check back soon.</div>
            </div>
          )
        ) : (
          hasDeltaBarsData ? (
            <DeltaBarsChart
              bars={deltaBars}
              selectedWindows={selectedWindows}
              timelineFilter={timelineFilter}
            />
          ) : (
            <div className="p-6 rounded-lg border dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-center">
              <div className="text-gray-700 dark:text-gray-300 font-medium">Today&apos;s options data isn&apos;t available yet.</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">We update after market open (ET). Please check back soon.</div>
            </div>
          )
        )}
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            How to Use This Data
          </h3>
        </div>
        <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
          <p>
            <strong>Bubbles Chart:</strong> Shows concentrated options activity at specific price levels. 
            Larger bubbles indicate higher money flow. Use this to identify key support/resistance levels.
          </p>
          <p>
            <strong>Delta Bars:</strong> Shows the difference between call and put money flow over time windows. 
            Positive values indicate bullish sentiment, negative values indicate bearish sentiment.
          </p>
          <p>
            <strong>⚠️ Disclaimer:</strong> This is not a trading signal. Options activity can represent hedging or speculation. 
            Use this as context alongside other analysis.
          </p>
        </div>
      </div>

      {/* Bubble Filters Bottom Sheet */}
      {showBubbleFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBubbleFilters(false)}></div>
          <div className="relative w-full max-w-2xl rounded-t-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6">
            <div className="mx-auto mb-4 h-1 w-16 rounded bg-gray-300 dark:bg-gray-700"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bubble Filters</h3>
              <button
                className="text-blue-600 hover:underline"
                onClick={() => setShowBubbleFilters(false)}
              >
                Done
              </button>
            </div>
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Minimum Thresholds</div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-800 dark:text-gray-200">Min Total Diff</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatMoney(minTotal * 10000)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={minTotal}
                  onChange={(e) => setMinTotal(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-800 dark:text-gray-200">Min Max Abs Diff</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatMoney(minMaxAbs * 10000)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={minMaxAbs}
                  onChange={(e) => setMinMaxAbs(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-800 dark:text-gray-200">Min Accumulated</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatMoney(minAccum * 10000)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={10}
                  value={minAccum}
                  onChange={(e) => setMinAccum(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => { setMinTotal(5); setMinMaxAbs(5); setMinAccum(1200) }}
                className="text-blue-600 hover:underline"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}

export default function FuturePage() {
  return (
    <ProtectedRoute>
      <FuturePageContent />
    </ProtectedRoute>
  )
}

