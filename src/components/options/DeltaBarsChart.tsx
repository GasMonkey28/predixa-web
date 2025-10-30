'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine } from 'recharts'

interface DeltaBar {
  expiration: string
  option_type: string
  windows: { [key: string]: { money: number; weighted?: number; max_abs_diff?: number; max_target?: number } }
}

interface DeltaBarsChartProps {
  bars: DeltaBar[]
  selectedWindows: string[]
  timelineFilter?: TimelineFilterType
}

type TimelineFilterType = '1M' | '3M' | '6M' | '1Y' | 'Max'

// Fixed window order - colors are assigned based on position in this array
const WINDOW_ORDER = ['1d', '3d', '5d', '10d', '20d']

// Fixed color mapping for each window - distinct colors for better differentiation
// Using different hues to make 1d, 5d, 20d easily distinguishable
const CALL_COLORS: { [key: string]: string } = {
  '1d': 'rgba(59, 130, 246, 0.95)',   // Bright blue - most important, highest contrast
  '3d': 'rgba(6, 182, 212, 0.85)',    // Cyan/teal - distinct from blue
  '5d': 'rgba(139, 92, 246, 0.9)',    // Purple/violet - very distinct from blue
  '10d': 'rgba(245, 158, 11, 0.85)',  // Amber/orange - distinct warm color
  '20d': 'rgba(16, 185, 129, 0.9)'    // Emerald/green - very distinct from blue
}

const PUT_COLORS: { [key: string]: string } = {
  '1d': 'rgba(37, 99, 235, 0.95)',     // Darker blue for negative 1d (same hue as positive)
  '3d': 'rgba(6, 182, 212, 0.75)',     // Same cyan, darker for negative
  '5d': 'rgba(139, 92, 246, 0.7)',     // Same purple, darker for negative
  '10d': 'rgba(245, 158, 11, 0.75)',   // Same amber, darker for negative
  '20d': 'rgba(16, 185, 129, 0.75)'    // Same emerald, darker for negative
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z')
}

function getMaxExpirationDate(filter: TimelineFilterType): Date | null {
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

export default function DeltaBarsChart({ bars, selectedWindows, timelineFilter = '1M' }: DeltaBarsChartProps) {
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null)

  // Filter bars by timeline
  const maxExpirationDate = getMaxExpirationDate(timelineFilter)
  const filteredBars = useMemo(() => {
    if (!maxExpirationDate) return bars
    return bars.filter(bar => {
      const expDate = parseDate(bar.expiration)
      return expDate <= maxExpirationDate
    })
  }, [bars, maxExpirationDate])

  // Group by expiration and calculate delta (call - put) for each window
  const chartData = useMemo(() => {
    const byExpiration = new Map<string, { call?: DeltaBar; put?: DeltaBar }>()
    
    // Group bars by expiration and option type
    filteredBars.forEach(bar => {
      if (!byExpiration.has(bar.expiration)) {
        byExpiration.set(bar.expiration, {})
      }
      const group = byExpiration.get(bar.expiration)!
      if (bar.option_type === 'call') {
        group.call = bar
      } else if (bar.option_type === 'put') {
        group.put = bar
      }
    })

    // Transform to chart data format - one entry per expiration with delta values for each window
    const result: Array<{
      expiration: string
      [key: string]: string | number // Dynamic keys for each window (1d, 3d, etc.)
    }> = []

    Array.from(byExpiration.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([expiration, group]) => {
        const entry: any = { expiration }
        
        WINDOW_ORDER.forEach(window => {
          if (!selectedWindows.includes(window)) return
          
          const callMoney = group.call?.windows?.[window]?.money ?? 0
          const putMoney = group.put?.windows?.[window]?.money ?? 0
          const delta = (callMoney - putMoney) / 10000 // Convert to millions
          
          // Only include if delta is significant
          if (Math.abs(delta) > 0.01) {
            entry[window] = delta
          } else {
            entry[window] = 0
          }
        })
        
        result.push(entry)
      })

    return result
  }, [filteredBars, selectedWindows])

  const formatMoney = (val: number) => {
    if (Math.abs(val) >= 1000) {
      return `$${(val / 1000).toFixed(1)}B`
    } else {
      return `$${val.toFixed(1)}M`
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
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2 dark:text-white">{formatExpDateShort(label)}</p>
          <div className="space-y-1 text-sm">
            {WINDOW_ORDER.filter(w => selectedWindows.includes(w)).map(window => {
              const value = payload.find((p: any) => p.dataKey === window)?.value
              if (value === undefined) return null
              
              const isPositive = value >= 0 
              const color = isPositive ? CALL_COLORS[window] : PUT_COLORS[window]
              
              return (
                <div key={window} className="flex justify-between gap-4 items-center">
                  <span className="dark:text-gray-300">{window}:</span>
                  <span 
                    className="font-mono font-semibold"
                    style={{ color }}
                  >
                    {formatMoney(Math.abs(value))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    return null
  }

  // Get y-axis range - ensure 0 is always included
  const yDomain = useMemo(() => {
    const allValues: number[] = []
    chartData.forEach(entry => {
      WINDOW_ORDER.forEach(window => {
        if (selectedWindows.includes(window) && entry[window] !== undefined) {
          allValues.push(entry[window] as number)
        }
      })
    })
    
    if (allValues.length === 0) return [-10, 10]
    
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const padding = Math.max(Math.abs(min), Math.abs(max)) * 0.15
    
    // Ensure domain always includes 0
    const domainMin = Math.min(min - padding, 0)
    const domainMax = Math.max(max + padding, 0)
    
    return [domainMin, domainMax]
  }, [chartData, selectedWindows])

  // Calculate ticks with fixed 20M spacing
  const yTicks = useMemo(() => {
    const [min, max] = yDomain
    const ticks: number[] = []
    
    // Fixed interval of 20M
    const interval = 20
    
    // Find the starting tick (round down to nearest multiple of 20 below min)
    const startTick = Math.floor(min / interval) * interval
    
    // Find the ending tick (round up to nearest multiple of 20 above max)
    const endTick = Math.ceil(max / interval) * interval
    
    // Generate ticks at 20M intervals
    for (let i = startTick; i <= endTick; i += interval) {
      ticks.push(i)
    }
    
    // Ensure 0 is always included
    if (!ticks.includes(0)) {
      ticks.push(0)
    }
    
    return ticks.sort((a, b) => a - b)
  }, [yDomain])

  // Check if a date string is a Friday
  const isFriday = (dateStr: string): boolean => {
    const date = parseDate(dateStr)
    return date.getDay() === 5 // Friday is day 5 (0 = Sunday, 5 = Friday)
  }

  // X-axis labels - prioritize Fridays (active expiration dates), prevent overlap
  const xAxisLabels = useMemo(() => {
    const uniqueExps = Array.from(new Set(chartData.map(d => d.expiration))).sort()
    
    if (uniqueExps.length === 0) return []
    
    // For longer timelines, use Friday-only strategy
    if (timelineFilter === '6M' || timelineFilter === '1Y' || timelineFilter === 'Max') {
      // Show only Fridays
      const fridays = uniqueExps.filter(isFriday)
      if (fridays.length > 12) {
        // If too many Fridays, show every other Friday
        return fridays.filter((_, index) => index % 2 === 0)
      }
      return fridays
    }
    
    // For shorter timelines (1M, 3M)
    // Strategy: Try to show all Fridays first
    const fridays = uniqueExps.filter(isFriday)
    
    if (fridays.length > 0 && fridays.length <= 8) {
      // If reasonable number of Fridays, show all Fridays
      return fridays
    } else if (fridays.length > 8) {
      // Too many Fridays, show every other Friday
      return fridays.filter((_, index) => index % 2 === 0)
    } else {
      // No Fridays or very few, fall back to every other expiration
      return uniqueExps.filter((_, index) => index % 2 === 0)
    }
  }, [chartData, timelineFilter])

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={765}>
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          barCategoryGap="25%"
          onMouseMove={(e: any) => {
            const exp = e?.activePayload?.[0]?.payload?.expiration
            setSelectedExpiration(exp || null)
          }}
          onMouseLeave={() => setSelectedExpiration(null)}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e5e7eb"
            horizontal={false}
            vertical={true}
          />
          <XAxis 
            dataKey="expiration" 
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => {
              if (xAxisLabels.includes(value)) {
                return formatExpDateShort(value)
              }
              return ''
            }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={80}
            tickMargin={5}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatMoney(value)}
            label={{ value: 'Avg Daily $M Delta', angle: -90, position: 'insideLeft' }}
            domain={yDomain}
            ticks={yTicks}
            axisLine={true}
            tickLine={false}
          />
          <ReferenceLine 
            y={0} 
            stroke="#6b7280" 
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            content={() => (
              <div className="flex flex-wrap gap-4 justify-center mt-4 text-sm">
                {WINDOW_ORDER.filter(w => selectedWindows.includes(w)).map(window => {
                  const color = CALL_COLORS[window]
                  return (
                    <div key={window} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: color }}
                      ></div>
                      <span>{window}</span>
                    </div>
                  )
                })}
              </div>
            )}
          />
          
          {/* Render a Bar for each selected window - grouped, not stacked */}
          {WINDOW_ORDER.filter(w => selectedWindows.includes(w)).map(window => (
            <Bar 
              key={window}
              dataKey={window}
              fill={CALL_COLORS[window]}
              radius={[4, 4, 0, 0]}
              barSize={14}
            >
              {/* Color bars based on positive/negative values */}
              {chartData.map((entry, index) => {
                const value = entry[window] as number
                const isPositive = value >= 0
                const baseColor = isPositive ? CALL_COLORS[window] : PUT_COLORS[window]
                const opacity = selectedExpiration && selectedExpiration !== entry.expiration ? 0.3 : 1.0
                
                // Adjust opacity in the rgba color
                const colorWithOpacity = baseColor.replace(/[\d\.]+\)$/g, `${opacity})`)
                
                return (
                  <Cell 
                    key={`cell-${window}-${index}`}
                    fill={colorWithOpacity}
                  />
                )
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Selected Expiration Details */}
      {selectedExpiration && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          <h3 className="font-semibold mb-2 dark:text-white">{formatExpDateShort(selectedExpiration)}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            {WINDOW_ORDER.filter(w => selectedWindows.includes(w)).map(window => {
              const entry = chartData.find(d => d.expiration === selectedExpiration)
              const value = entry?.[window] as number | undefined
              if (value === undefined || Math.abs(value) < 0.01) return null
              
              const isPositive = value >= 0
              const color = isPositive ? CALL_COLORS[window] : PUT_COLORS[window]
              
              return (
                <div key={window} className="flex justify-between items-center">
                  <span className="dark:text-gray-300">{window}:</span>
                  <span 
                    className="font-mono font-semibold"
                    style={{ color }}
                  >
                    {formatMoney(Math.abs(value))}
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
