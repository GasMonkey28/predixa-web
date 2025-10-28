'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import CandlestickChart from '@/components/charts/CandlestickChart'
import DailyTiers from '@/components/trading/DailyTiers'
import EconomicCalendar from '@/components/trading/EconomicCalendar'
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

  // Calculate basic statistics
  const currentPrice = rows[rows.length - 1]?.c || 0
  const previousPrice = rows[rows.length - 2]?.c || 0
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Daily Analysis</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">SPY Daily OHLC Data</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setRefreshKey(prev => prev + 1)
              setLoading(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh Data
          </button>
          <div className="text-right">
            <div className="text-2xl font-bold dark:text-white">
              ${currentPrice.toFixed(2)}
            </div>
            <div className={`text-sm ${priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </div>
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
        <h2 className="text-lg font-medium dark:text-white mb-4">Intraday Price Chart</h2>
        {chartType === 'candlestick' ? (
          <CandlestickChart data={chartData} height={400} />
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
                labelStyle={{ color: '#374151' }}
              />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trading Signals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DailyTiers ticker="SPY" />
        <EconomicCalendar minImpact={2} />
      </div>

      {/* Data Table */}
      <div className="rounded-lg border dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <div className="mb-4">
          <h2 className="text-lg font-medium dark:text-white">Recent Data Points</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Last {Math.min(10, rows.length)} data points</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Open</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">High</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Low</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Close</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Volume</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {rows.slice(-10).map((bar: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                    {new Date(bar.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${bar.o.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                    ${bar.h.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                    ${bar.l.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">
                    ${bar.c.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {bar.v ? bar.v.toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

