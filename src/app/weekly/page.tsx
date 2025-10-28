'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import CandlestickChart from '@/components/charts/CandlestickChart'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

type ChartType = 'line' | 'candlestick'

function WeeklyPageContent() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('line')

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/bars/weekly')
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError('Failed to load data')
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
        <div className="text-center text-red-600">{error || 'No data available'}</div>
      </main>
    )
  }

  const rows = data.bars?.slice(-50) || []
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
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Weekly Analysis</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">SPY Weekly OHLC Data & Trading Signals</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold dark:text-white">
            ${currentPrice.toFixed(2)}
          </div>
          <div className={`text-sm ${priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Chart Type Selector */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setChartType('candlestick')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'candlestick'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Candlestick
          </button>
        </div>
      </div>

      {/* Price Chart */}
      <div className="mb-6 rounded-lg border dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-medium dark:text-white mb-4">Price Chart</h2>
        {chartType === 'candlestick' ? (
          <CandlestickChart data={chartData} height={400} />
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
                stroke="currentColor"
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                tick={{ fontSize: 12 }}
                stroke="currentColor"
                className="text-gray-600 dark:text-gray-400"
              />
              <Tooltip 
                formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'var(--tw-bg-opacity, 1)', 
                  border: '1px solid var(--tw-border-opacity, 1)',
                  borderRadius: '0.5rem'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
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

