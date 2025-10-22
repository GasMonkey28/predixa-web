'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DeltaBar {
  expiration: string
  option_type: string
  windows: { [key: string]: { money: number; weighted?: number; max_abs_diff?: number; max_target?: number } }
}

interface DeltaBarsChartProps {
  bars: DeltaBar[]
  selectedWindows: string[]
}

export default function DeltaBarsChart({ bars, selectedWindows }: DeltaBarsChartProps) {
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null)

  const windowOrder = ['1d', '3d', '5d', '10d', '20d']
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple  
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f59e0b'  // amber
  ]

  // Transform data for bar chart - create separate entries for each window
  const chartData = bars
    .filter(bar => selectedWindows.some(window => bar.windows[window]))
    .flatMap(bar => {
      return selectedWindows.map((window, index) => {
        const windowData = bar.windows[window]
        if (!windowData) return null
        
        const money = windowData.money || 0
        const delta = money / 10000 // Convert to millions
        
        return {
          expiration: bar.expiration,
          window,
          delta: Math.abs(delta), // Use absolute value for visualization
          isPositive: delta >= 0,
          colorIndex: index,
          rawMoney: money,
          formattedMoney: delta
        }
      }).filter(item => item !== null)
    })

  const formatMoney = (val: number) => {
    const millions = val
    if (Math.abs(millions) >= 1000) {
      return `$${(millions / 1000).toFixed(1)}B`
    } else {
      return `$${millions.toFixed(1)}M`
    }
  }

  const formatExpDateShort = (dateStr: string) => {
    const components = dateStr.split('-')
    if (components.length === 3) {
      return `${components[1]}-${components[2]}`
    }
    return dateStr
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{formatExpDateShort(data.expiration)}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span>Window:</span>
              <span>{data.window}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Money Flow:</span>
              <span className={`font-mono ${data.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(data.formattedMoney)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Raw Value:</span>
              <span className="font-mono text-gray-600">${data.rawMoney.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Get unique expirations for x-axis
  const uniqueExpirations = Array.from(new Set(chartData.map(item => item.expiration))).sort()

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={450}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="expiration" 
            tick={{ fontSize: 12 }}
            tickFormatter={formatExpDateShort}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatMoney(value)}
            label={{ value: 'Money Flow ($M)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Render bars with colors based on window */}
          <Bar dataKey="delta" radius={[2, 2, 0, 0]}>
            {chartData.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[entry.colorIndex] || colors[0]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {selectedWindows.map((window, index) => (
          <div key={window} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: colors[index] }}
            ></div>
            <span>{window} Window</span>
          </div>
        ))}
      </div>

      {/* Selected Expiration Details */}
      {selectedExpiration && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">{formatExpDateShort(selectedExpiration)}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selectedWindows.map(window => {
              const item = chartData.find(d => d.expiration === selectedExpiration && d.window === window)
              if (!item) return null
              
              return (
                <div key={window} className="flex justify-between">
                  <span>{window}:</span>
                  <span className={`font-mono ${item.isPositive ? 'text-blue-600' : 'text-gray-600'}`}>
                    {formatMoney(item.delta)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
