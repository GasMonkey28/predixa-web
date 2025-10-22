'use client'

import { useState } from 'react'
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
  const filteredBubbles = bubbles.filter(bubble => {
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

  // Transform data for scatter chart
  const chartData = filteredBubbles.map(bubble => ({
    x: new Date(bubble.expiration).getTime(),
    y: bubble.price,
    size: getBubbleSize(bubble),
    color: getBubbleColor(bubble),
    symbol: getBubbleSymbol(bubble),
    ...bubble
  }))

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
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.expiration}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span>Price:</span>
              <span className="font-mono">${data.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Strike:</span>
              <span className="font-mono">${data.strike.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Type:</span>
              <span className="capitalize">{data.option_type}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Money:</span>
              <span className="font-mono">{formatMoney(data.money)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Metric:</span>
              <span className="text-xs">{data.metric}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
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
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            dataKey="y"
            fill="#3b82f6"
            r={5}
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
