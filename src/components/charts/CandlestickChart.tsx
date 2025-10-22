'use client'

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CandlestickData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface CandlestickChartProps {
  data: CandlestickData[]
  height?: number
}

export default function CandlestickChart({ data, height = 400 }: CandlestickChartProps) {
  // Transform data for candlestick visualization
  const chartData = data.map((item, index) => ({
    ...item,
    index,
    // Create fake bars for candlestick effect
    fakeBar: Math.abs(item.high - item.low) * 0.1, // Small fake bar for the candlestick body
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.time}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Open:</span>
              <span className="font-mono">${data.open.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-green-600">High:</span>
              <span className="font-mono">${data.high.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-red-600">Low:</span>
              <span className="font-mono">${data.low.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-blue-600">Close:</span>
              <span className="font-mono">${data.close.toFixed(2)}</span>
            </div>
            {data.volume && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Volume:</span>
                <span className="font-mono">{data.volume.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            stroke="#666"
          />
          <YAxis 
            domain={['dataMin - 2', 'dataMax + 2']}
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* High-Low lines (wicks) */}
          <Line
            type="monotone"
            dataKey="high"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="low"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          
          {/* Open-Close bars (body) */}
          <Bar
            dataKey="fakeBar"
            fill="#10b981"
            radius={[2, 2, 2, 2]}
          />
          
          {/* Close price line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
