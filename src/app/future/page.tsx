'use client'

import { useState, useEffect } from 'react'
import BubblesChart from '@/components/options/BubblesChart'
import DeltaBarsChart from '@/components/options/DeltaBarsChart'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

type ViewMode = 'bubbles' | 'deltaBars'

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
  const [viewMode, setViewMode] = useState<ViewMode>('bubbles')
  
  // Bubble filters
  const [minTotal, setMinTotal] = useState(5)
  const [minMaxAbs, setMinMaxAbs] = useState(5)
  const [minAccum, setMinAccum] = useState(1200)
  const [showTotalDiff, setShowTotalDiff] = useState(true)
  const [showAccumulated, setShowAccumulated] = useState(true)
  const [showMaxAbsDiff, setShowMaxAbsDiff] = useState(true)
  
  // Delta bars filters
  const [selectedWindows, setSelectedWindows] = useState<string[]>(['1d', '5d', '20d'])

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

  // Add some mock data if no real data is available
  const mockBubbles = bubbles.length === 0 ? [
    {
      expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      price: 450,
      strike: 450,
      option_type: 'call',
      metric: 'total_diff_money',
      money: 5000000 // 5M
    },
    {
      expiration: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days from now
      price: 460,
      strike: 460,
      option_type: 'put',
      metric: 'accumulated_money',
      money: 3000000 // 3M
    }
  ] : bubbles

  const mockDeltaBars = deltaBars.length === 0 ? [
    {
      expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      option_type: 'call',
      windows: {
        '1d': { money: 1500000 },
        '3d': { money: 1800000 },
        '5d': { money: 2200000 },
        '10d': { money: 2800000 },
        '20d': { money: 3200000 }
      }
    },
    {
      expiration: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      option_type: 'put',
      windows: {
        '1d': { money: 1200000 },
        '3d': { money: 1500000 },
        '5d': { money: 1800000 },
        '10d': { money: 2200000 },
        '20d': { money: 2500000 }
      }
    },
    {
      expiration: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      option_type: 'call',
      windows: {
        '1d': { money: 800000 },
        '3d': { money: 1100000 },
        '5d': { money: 1400000 },
        '10d': { money: 1800000 },
        '20d': { money: 2100000 }
      }
    }
  ] : deltaBars

  const formatMoney = (val: number) => {
    const millions = val / 10_000.0
    if (Math.abs(millions) >= 1000) {
      return `$${(millions / 1000).toFixed(1)}B`
    } else {
      return `$${millions.toFixed(1)}M`
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Options Flow Analysis</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">SPY Options Flow & Key Levels</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">Date: {nyTodayISO()}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {bubbles.length} Bubbles, {deltaBars.length} Delta Bars
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('bubbles')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'bubbles'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Key Levels (Bubbles)
          </button>
          <button
            onClick={() => setViewMode('deltaBars')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'deltaBars'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Flow Timeline (Delta Bars)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bubbles</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{mockBubbles.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Delta Bars</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{mockDeltaBars.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Price Candles</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{priceCandles.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Money Flow</h3>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {formatMoney(bubbles.reduce((sum: number, b: any) => sum + Math.abs(b.money || 0), 0))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
        <h2 className="text-lg font-medium dark:text-white mb-4">Filters & Controls</h2>
        
        {viewMode === 'bubbles' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Space Metrics
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showTotalDiff}
                    onChange={(e) => setShowTotalDiff(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm dark:text-gray-300">Total Diff</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showAccumulated}
                    onChange={(e) => setShowAccumulated(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm dark:text-gray-300">Accumulated</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showMaxAbsDiff}
                    onChange={(e) => setShowMaxAbsDiff(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm dark:text-gray-300">Max Abs Diff</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Total Diff (M)
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={minTotal}
                onChange={(e) => setMinTotal(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400">{minTotal}M</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Accumulated (M)
              </label>
              <input
                type="range"
                min="0"
                max="3000"
                step="50"
                value={minAccum}
                onChange={(e) => setMinAccum(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400">{minAccum}M</div>
            </div>
          </div>
        )}
        
        {viewMode === 'deltaBars' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Windows
            </label>
            <div className="flex flex-wrap gap-2">
              {['1d', '3d', '5d', '10d', '20d'].map(window => (
                <label key={window} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedWindows.includes(window)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedWindows([...selectedWindows, window])
                      } else {
                        setSelectedWindows(selectedWindows.filter(w => w !== window))
                      }
                    }}
                    className="mr-1"
                  />
                  <span className="text-sm dark:text-gray-300">{window}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chart Display */}
      <div className="mb-6 rounded-lg border dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-medium dark:text-white mb-4">
          {viewMode === 'bubbles' ? 'Key Levels (Bubbles Chart)' : 'Flow Timeline (Delta Bars)'}
        </h2>
        
        {viewMode === 'bubbles' ? (
          <BubblesChart
            bubbles={mockBubbles}
            priceCandles={priceCandles}
            minTotal={minTotal}
            minMaxAbs={minMaxAbs}
            minAccum={minAccum}
            showTotalDiff={showTotalDiff}
            showAccumulated={showAccumulated}
            showMaxAbsDiff={showMaxAbsDiff}
          />
        ) : (
          <DeltaBarsChart
            bars={mockDeltaBars}
            selectedWindows={selectedWindows}
          />
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

      {/* Raw Data Debug (for development) */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          Debug: Raw Data Structure
        </summary>
        <pre className="mt-2 overflow-auto rounded-lg border dark:border-gray-700 p-4 text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        {JSON.stringify(Object.keys(data), null, 2)}
      </pre>
      </details>
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

