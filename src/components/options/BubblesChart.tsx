'use client'

import { useState, useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Bubble {
  expiration: string
  price: number
  strike: number
  option_type: string
  metric: string
  money: number
}

interface BubblesChartProps {
  bubbles: Bubble[]
  priceCandles?: any[]
  minTotal?: number
  minMaxAbs?: number
  minAccum?: number
  showTotalDiff?: boolean
  showAccumulated?: boolean
  showMaxAbsDiff?: boolean
}

export default function BubblesChart({
  bubbles,
  priceCandles = [],
  minTotal = 5,
  minMaxAbs = 5,
  minAccum = 1200,
  showTotalDiff = true,
  showAccumulated = true,
  showMaxAbsDiff = true
}: BubblesChartProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const getBubbleSize = (bubble: Bubble) => {
    const moneyInMillions = Math.abs(bubble.money) / 10000
    const scale = bubble.metric === 'accumulated_money' ? 20 : 2
    const size = moneyInMillions / scale
    return Math.max(10, Math.min(100, size))
  }

  const getBubbleColor = (bubble: Bubble) => {
    if (bubble.option_type === 'put' && bubble.money < 0) return '#fbbf24' // yellow
    if (bubble.option_type === 'call' && bubble.money < 0) return '#8b5cf6' // purple
    if (bubble.option_type === 'put') return '#ef4444' // red
    return '#3b82f6' // blue
  }

  const getBubbleSymbol = (bubble: Bubble) => {
    switch (bubble.metric) {
      case 'accumulated_money': return 'circle'
      case 'total_diff_money': return 'diamond'
      case 'max_abs_diff_money': return 'cross'
      default: return 'circle'
    }
  }

  // Filter bubbles based on metrics and thresholds
  const metricFiltered = bubbles.filter(bubble => {
    const moneyInMillions = Math.abs(bubble.money) / 10000
    
    switch (bubble.metric) {
      case 'total_diff_money':
        return showTotalDiff && moneyInMillions >= minTotal
      case 'accumulated_money':
        return showAccumulated && moneyInMillions >= minAccum
      case 'max_abs_diff_money':
        return showMaxAbsDiff && moneyInMillions >= minMaxAbs
      default:
        return false
    }
  })

  const filteredBubbles = metricFiltered

  // Transform data for scatter chart
  const chartData = filteredBubbles.map(bubble => ({
    x: new Date(bubble.expiration).getTime(),
    y: bubble.price,
    size: getBubbleSize(bubble),
    color: getBubbleColor(bubble),
    symbol: getBubbleSymbol(bubble),
    ...bubble
  }))

  // Compute Y-axis domain based on price range, rounded to nearest 10s
  const [yMin, yMax] = useMemo(() => {
    if (filteredBubbles.length === 0) return [0, 100]
    const prices = filteredBubbles.map(b => b.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const roundedMin = Math.floor(min / 10) * 10
    const roundedMax = Math.ceil(max / 10) * 10
    return [roundedMin, roundedMax]
  }, [filteredBubbles])

  const formatMoney = (val: number) => {
    const millions = val / 10_000.0
    if (Math.abs(millions) >= 1000) {
      return `$${(millions / 1000).toFixed(1)}B`
    } else {
      return `$${millions.toFixed(1)}M`
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold">{data.expiration}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-700 dark:text-gray-300">Price:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">${data.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-700 dark:text-gray-300">Strike:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">${data.strike.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-700 dark:text-gray-300">Type:</span>
              <span className="capitalize text-gray-900 dark:text-white">{data.option_type}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-700 dark:text-gray-300">Money:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{formatMoney(data.money)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-700 dark:text-gray-300">Metric:</span>
              <span className="text-xs text-gray-900 dark:text-gray-200">{data.metric}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={765}>
        <ScatterChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey="x" 
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            dataKey="y" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            domain={[yMin, yMax]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            dataKey="y"
            shape={(props: any) => {
              const { cx, cy, payload } = props
              const size = payload.size || 6
              const color = payload.color || '#3b82f6'
              const symbol = payload.symbol || 'circle'
              if (symbol === 'diamond') {
                const half = size / 1.2
                return (
                  <g>
                    <polygon 
                      points={`${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`} 
                      fill="none" 
                      stroke={color} 
                      strokeWidth={2}
                    />
                  </g>
                )
              }
              if (symbol === 'cross') {
                const half = size / 1.2
                return (
                  <g stroke={color} strokeWidth={2}>
                    <line x1={cx - half} y1={cy - half} x2={cx + half} y2={cy + half} />
                    <line x1={cx - half} y1={cy + half} x2={cx + half} y2={cy - half} />
                  </g>
                )
              }
              return <circle cx={cx} cy={cy} r={size / 2} fill="none" stroke={color} strokeWidth={2} />
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Call Options</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Put Options</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>Put Selling</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span>Call Selling</span>
        </div>
      </div>
    </div>
  )
}
