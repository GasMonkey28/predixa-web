'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { getWeekDateRange } from '@/lib/trading-calendar'

interface CandlestickData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
  long_tier?: string
  short_tier?: string
  predictionStatus?: 'correct' | 'incorrect' | 'neutral'
  isCompensated?: boolean
}

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
}

interface CandlestickChartProps {
  data: CandlestickData[]
  height?: number
  weeklyPredictions?: WeeklyPredictions
}

export default function CandlestickChart({ data, height = 400, weeklyPredictions }: CandlestickChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const chartDimensions = useMemo(() => {
    if (!data.length) return { width: 0, height: 0, margin: { top: 20, right: 30, left: 50, bottom: 85 } }
    
    // Increase bottom margin to accommodate tier labels, prediction indicators, and compensation checkmarks
    const margin = { top: 20, right: 30, left: 50, bottom: 85 }
    const chartWidth = containerWidth - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom
    
    return { width: chartWidth, height: chartHeight, margin }
  }, [data, height, containerWidth])

  const scales = useMemo(() => {
    if (!data.length) return { xScale: 0, yScale: 0, minPrice: 0, maxPrice: 0 }
    
    const { width, height, margin } = chartDimensions
    const minPrice = Math.min(...data.map(d => d.low)) - 2
    const maxPrice = Math.max(...data.map(d => d.high)) + 2
    
    const xScale = width / data.length
    const yScale = height / (maxPrice - minPrice)
    
    return { xScale, yScale, minPrice, maxPrice }
  }, [data, chartDimensions])

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  const renderCandlestick = (item: CandlestickData, index: number) => {
    const { xScale, yScale } = scales
    const { width, height, margin } = chartDimensions
    
    const x = margin.left + index * xScale + xScale / 2
    const isGreen = item.close >= item.open
    
    // Calculate y positions (inverted because SVG y increases downward)
    const highY = margin.top + (scales.maxPrice - item.high) * yScale
    const lowY = margin.top + (scales.maxPrice - item.low) * yScale
    const openY = margin.top + (scales.maxPrice - item.open) * yScale
    const closeY = margin.top + (scales.maxPrice - item.close) * yScale
    
    const bodyTop = Math.min(openY, closeY)
    const bodyBottom = Math.max(openY, closeY)
    const bodyHeight = Math.abs(closeY - openY)
    
    const candleWidth = Math.max(4, xScale * 0.6)
    const halfWidth = candleWidth / 2
    
    return (
      <g key={index}>
        {/* Wick (high-low line) */}
        <line
          x1={x}
          y1={highY}
          x2={x}
          y2={lowY}
          stroke="#666"
          strokeWidth={1}
        />
        
        {/* Body */}
        <rect
          x={x - halfWidth}
          y={bodyTop}
          width={candleWidth}
          height={Math.max(bodyHeight, 1)}
          fill={isGreen ? '#10b981' : '#ef4444'}
          stroke={isGreen ? '#059669' : '#dc2626'}
          strokeWidth={1}
          rx={1}
        />
        
        {/* Open tick (left side) */}
        <line
          x1={x - halfWidth - 2}
          y1={openY}
          x2={x - halfWidth}
          y2={openY}
          stroke={isGreen ? '#10b981' : '#ef4444'}
          strokeWidth={2}
        />
        
        {/* Close tick (right side) */}
        <line
          x1={x + halfWidth}
          y1={closeY}
          x2={x + halfWidth + 2}
          y2={closeY}
          stroke={isGreen ? '#10b981' : '#ef4444'}
          strokeWidth={2}
        />
        
        {/* Invisible hover area */}
        <rect
          x={x - xScale / 2}
          y={margin.top}
          width={xScale}
          height={height}
          fill="transparent"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        />
      </g>
    )
  }

  const renderTierLabels = () => {
    const { width, height, margin } = chartDimensions
    const { xScale } = scales
    
    const labels = []
    
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      if (!item.long_tier && !item.short_tier) continue
      
      const x = margin.left + i * xScale + xScale / 2
      const tierLabel = item.long_tier && item.short_tier 
        ? `${item.long_tier}/${item.short_tier}`
        : item.long_tier || item.short_tier || ''
      
      // Position tier label below the date labels
      const tierLabelY = margin.top + height + 30
      
      // Position prediction indicator below tier label
      const predictionY = tierLabelY + 15
      
      // Add checkmark, X mark, or gray dash based on prediction status
      const status = item.predictionStatus
      
      labels.push(
        <g key={`tier-label-${i}`}>
          <text
            x={x}
            y={tierLabelY}
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
            className="text-zinc-300 font-semibold"
          >
            {tierLabel}
          </text>
          {status && (
            <g>
              {status === 'correct' ? (
                <circle
                  cx={x}
                  cy={predictionY}
                  r="7"
                  fill="#10b981"
                />
              ) : status === 'incorrect' ? (
                <circle
                  cx={x}
                  cy={predictionY}
                  r="7"
                  fill="#ef4444"
                />
              ) : (
                <circle
                  cx={x}
                  cy={predictionY}
                  r="7"
                  fill="#6b7280"
                />
              )}
              <text
                x={x}
                y={predictionY + 3}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                fontWeight="bold"
              >
                {status === 'correct' ? '✓' : status === 'incorrect' ? '✗' : '−'}
              </text>
              {/* Compensation checkmark below X mark */}
              {status === 'incorrect' && item.isCompensated && (
                <g>
                  <circle
                    cx={x}
                    cy={predictionY + 20}
                    r="6"
                    fill="#10b981"
                  />
                  <text
                    x={x}
                    y={predictionY + 23}
                    textAnchor="middle"
                    fontSize="9"
                    fill="white"
                    fontWeight="bold"
                  >
                    ✓
                  </text>
                </g>
              )}
            </g>
          )}
        </g>
      )
    }
    
    return labels
  }

  const renderGrid = () => {
    const { width, height, margin } = chartDimensions
    const { minPrice, maxPrice } = scales
    
    const gridLines = []
    const priceRange = maxPrice - minPrice
    const numHorizontalLines = 5
    
    // Horizontal grid lines
    for (let i = 0; i <= numHorizontalLines; i++) {
      const price = minPrice + (priceRange * i) / numHorizontalLines
      const y = margin.top + (scales.maxPrice - price) * scales.yScale
      
      gridLines.push(
        <line
          key={`h-${i}`}
          x1={margin.left}
          y1={y}
          x2={margin.left + width}
          y2={y}
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeDasharray="3 3"
        />
      )
      
      // Y-axis labels
      gridLines.push(
        <text
          key={`y-label-${i}`}
          x={margin.left - 10}
          y={y + 4}
          textAnchor="end"
          fontSize="12"
          fill="currentColor"
          className="text-gray-600 dark:text-gray-400"
        >
          {formatPrice(price)}
        </text>
      )
    }
    
    return gridLines
  }

  const renderXAxisLabels = () => {
    const { width, height, margin } = chartDimensions
    const { xScale } = scales
    
    const labels = []
    // Show about 5-6 time labels
    const step = Math.max(1, Math.floor(data.length / 6))
    
    // Check if we have tier data - if so, position date labels higher
    const hasTierData = data.some(d => d.long_tier || d.short_tier)
    const dateLabelY = hasTierData 
      ? margin.top + height + 10  // Higher position when tiers are shown
      : margin.top + height + margin.bottom - 5  // Normal position
    
    for (let i = 0; i < data.length; i += step) {
      const x = margin.left + i * xScale + xScale / 2
      const label = data[i].time
      
      labels.push(
        <text
          key={`x-label-${i}`}
          x={x}
          y={dateLabelY}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          className="text-gray-600 dark:text-gray-400"
        >
          {label}
        </text>
      )
    }
    
    return labels
  }

  const renderTooltip = () => {
    if (hoveredIndex === null || !data[hoveredIndex]) return null
    
    const item = data[hoveredIndex]
    const { xScale } = scales
    const { margin } = chartDimensions
    const x = margin.left + hoveredIndex * xScale + xScale / 2
    
    return (
      <g>
        {/* Vertical line */}
        <line
          x1={x}
          y1={margin.top}
          x2={x}
          y2={margin.top + chartDimensions.height}
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        
        {/* Tooltip box */}
        <rect
          x={x + 10}
          y={margin.top + 10}
          width={180}
          height={120}
          fill="white"
          stroke="#e5e7eb"
          strokeWidth={1}
          rx={4}
        />
        
        {/* Tooltip content */}
        <text x={x + 20} y={margin.top + 30} fontSize="14" fontWeight="bold" fill="#374151">
          {item.time}
        </text>
        
        <text x={x + 20} y={margin.top + 50} fontSize="12" fill="#6b7280">
          Open: <tspan fill="#374151" fontFamily="monospace">{formatPrice(item.open)}</tspan>
        </text>
        
        <text x={x + 20} y={margin.top + 65} fontSize="12" fill="#6b7280">
          High: <tspan fill="#10b981" fontFamily="monospace">{formatPrice(item.high)}</tspan>
        </text>
        
        <text x={x + 20} y={margin.top + 80} fontSize="12" fill="#6b7280">
          Low: <tspan fill="#ef4444" fontFamily="monospace">{formatPrice(item.low)}</tspan>
        </text>
        
        <text x={x + 20} y={margin.top + 95} fontSize="12" fill="#6b7280">
          Close: <tspan fill="#3b82f6" fontFamily="monospace">{formatPrice(item.close)}</tspan>
        </text>
        
        {item.volume && (
          <text x={x + 20} y={margin.top + 110} fontSize="12" fill="#6b7280">
            Volume: <tspan fill="#374151" fontFamily="monospace">{item.volume.toLocaleString()}</tspan>
          </text>
        )}
      </g>
    )
  }

  const renderPredictionLines = () => {
    if (!weeklyPredictions || (!weeklyPredictions.currentWeek && !weeklyPredictions.previousWeek)) {
      return null
    }

    const { width, height, margin } = chartDimensions
    const { yScale, minPrice, maxPrice } = scales
    const lines: JSX.Element[] = []

    // Helper to get Y position for a price
    const getY = (price: number) => margin.top + (maxPrice - price) * yScale

    // Helper to get date string in ET timezone (YYYY-MM-DD)
    // Timestamps are in format "2025-09-18T09:30:00" (ET timezone, no timezone indicator)
    const getETDateString = (timestampOrDate: string | Date): string => {
      if (typeof timestampOrDate === 'string') {
        // Extract date part directly from timestamp string (format: "2025-09-18T09:30:00")
        const datePart = timestampOrDate.split('T')[0]
        if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          return datePart // Already in YYYY-MM-DD format
        }
        // Fallback: parse as Date and convert to ET
        const date = new Date(timestampOrDate)
        const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
        const year = etDate.getFullYear()
        const month = String(etDate.getMonth() + 1).padStart(2, '0')
        const day = String(etDate.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } else {
        // Date object: convert to ET timezone
        const etDate = new Date(timestampOrDate.toLocaleString('en-US', { timeZone: 'America/New_York' }))
        const year = etDate.getFullYear()
        const month = String(etDate.getMonth() + 1).padStart(2, '0')
        const day = String(etDate.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    }

    // Helper to check if a data point is within a date range
    const isInDateRange = (pointTimestamp: string | Date, monday: Date, friday: Date): boolean => {
      const pointDateStr = getETDateString(pointTimestamp)
      const mondayStr = getETDateString(monday)
      const fridayStr = getETDateString(friday)
      // Include all bars from Monday through Friday (inclusive)
      return pointDateStr >= mondayStr && pointDateStr <= fridayStr
    }

    // Render current week lines
    if (weeklyPredictions.currentWeek) {
      // Parse fwd_join_date as ET timezone (format: "2026-01-02")
      // Create date in ET timezone to avoid UTC conversion issues
      const fwdJoinDateStr = weeklyPredictions.currentWeek.fwd_join_date
      const [year, month, day] = fwdJoinDateStr.split('-').map(Number)
      // Create date at noon ET to avoid timezone edge cases
      const fridayDate = new Date()
      fridayDate.setFullYear(year, month - 1, day)
      fridayDate.setHours(12, 0, 0, 0) // Noon to avoid timezone issues
      
      const { monday, friday } = getWeekDateRange(fridayDate)
      
      // Find start and end indices for current week
      let startIndex = -1
      let endIndex = -1
      
      for (let i = 0; i < data.length; i++) {
        // Use timestamp if available (it's a string like "2025-09-18T09:30:00" in ET timezone)
        // Otherwise fall back to parsing the time string
        const pointTimestamp = (data[i] as any).timestamp || data[i].time
        if (isInDateRange(pointTimestamp, monday, friday)) {
          if (startIndex === -1) startIndex = i
          endIndex = i
        }
      }
      
      if (startIndex !== -1 && endIndex !== -1) {
        const startX = margin.left + startIndex * scales.xScale
        const endX = margin.left + (endIndex + 1) * scales.xScale
        
        // White line - predicted close
        lines.push(
          <line
            key="current-close"
            x1={startX}
            y1={getY(weeklyPredictions.currentWeek.t_close_to_pre)}
            x2={endX}
            y2={getY(weeklyPredictions.currentWeek.t_close_to_pre)}
            stroke="#ffffff"
            strokeWidth={2}
            strokeOpacity={0.8}
            strokeDasharray="5 5"
          />
        )
        
        // Green line - buy zone (lowest)
        lines.push(
          <line
            key="current-low"
            x1={startX}
            y1={getY(weeklyPredictions.currentWeek.t_lowest_to_close)}
            x2={endX}
            y2={getY(weeklyPredictions.currentWeek.t_lowest_to_close)}
            stroke="#10b981"
            strokeWidth={2}
            strokeOpacity={0.8}
            strokeDasharray="5 5"
          />
        )
        
        // Red line - sell zone (highest)
        lines.push(
          <line
            key="current-high"
            x1={startX}
            y1={getY(weeklyPredictions.currentWeek.t_highest_to_pre)}
            x2={endX}
            y2={getY(weeklyPredictions.currentWeek.t_highest_to_pre)}
            stroke="#ef4444"
            strokeWidth={2}
            strokeOpacity={0.8}
            strokeDasharray="5 5"
          />
        )
      }
    }

    // Render previous week lines
    if (weeklyPredictions.previousWeek) {
      // Parse fwd_join_date as ET timezone (format: "2026-01-02")
      // Create date in ET timezone to avoid UTC conversion issues
      const fwdJoinDateStr = weeklyPredictions.previousWeek.fwd_join_date
      const [year, month, day] = fwdJoinDateStr.split('-').map(Number)
      // Create date at noon ET to avoid timezone edge cases
      const fridayDate = new Date()
      fridayDate.setFullYear(year, month - 1, day)
      fridayDate.setHours(12, 0, 0, 0) // Noon to avoid timezone issues
      
      const { monday, friday } = getWeekDateRange(fridayDate)
      
      // Find start and end indices for previous week
      let startIndex = -1
      let endIndex = -1
      
      for (let i = 0; i < data.length; i++) {
        // Use timestamp if available (it's a string like "2025-09-18T09:30:00" in ET timezone)
        // Otherwise fall back to parsing the time string
        const pointTimestamp = (data[i] as any).timestamp || data[i].time
        if (isInDateRange(pointTimestamp, monday, friday)) {
          if (startIndex === -1) startIndex = i
          endIndex = i
        }
      }
      
      if (startIndex !== -1 && endIndex !== -1) {
        // Start at the left edge of the first bar, end at the right edge of the last bar
        const startX = margin.left + startIndex * scales.xScale
        const endX = margin.left + (endIndex + 1) * scales.xScale
        
        // White line - predicted close (lighter for previous week)
        lines.push(
          <line
            key="previous-close"
            x1={startX}
            y1={getY(weeklyPredictions.previousWeek.t_close_to_pre)}
            x2={endX}
            y2={getY(weeklyPredictions.previousWeek.t_close_to_pre)}
            stroke="#ffffff"
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeDasharray="3 3"
          />
        )
        
        // Green line - buy zone (lighter for previous week)
        lines.push(
          <line
            key="previous-low"
            x1={startX}
            y1={getY(weeklyPredictions.previousWeek.t_lowest_to_close)}
            x2={endX}
            y2={getY(weeklyPredictions.previousWeek.t_lowest_to_close)}
            stroke="#10b981"
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeDasharray="3 3"
          />
        )
        
        // Red line - sell zone (lighter for previous week)
        lines.push(
          <line
            key="previous-high"
            x1={startX}
            y1={getY(weeklyPredictions.previousWeek.t_highest_to_pre)}
            x2={endX}
            y2={getY(weeklyPredictions.previousWeek.t_highest_to_pre)}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeDasharray="3 3"
          />
        )
      }
    }

    return <g>{lines}</g>
  }

  if (!data.length) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg width="100%" height={height}>
        {/* Grid */}
        {renderGrid()}
        
        {/* Prediction Lines - rendered before candlesticks so they appear behind */}
        {renderPredictionLines()}
        
        {/* Candlesticks */}
        {data.map((item, index) => renderCandlestick(item, index))}
        
        {/* Tooltip */}
        {renderTooltip()}
        
        {/* X-axis */}
        <line
          x1={chartDimensions.margin.left}
          y1={chartDimensions.margin.top + chartDimensions.height}
          x2={chartDimensions.margin.left + chartDimensions.width}
          y2={chartDimensions.margin.top + chartDimensions.height}
          stroke="currentColor"
          className="text-gray-600 dark:text-gray-400"
          strokeWidth={1}
        />
        
        {/* X-axis labels - positioned UNDER the x-axis line */}
        {renderXAxisLabels()}
        
        {/* Tier labels - positioned below x-axis labels */}
        {renderTierLabels()}
        
        {/* Y-axis */}
        <line
          x1={chartDimensions.margin.left}
          y1={chartDimensions.margin.top}
          x2={chartDimensions.margin.left}
          y2={chartDimensions.margin.top + chartDimensions.height}
          stroke="currentColor"
          className="text-gray-600 dark:text-gray-400"
          strokeWidth={1}
        />
      </svg>
    </div>
  )
}
