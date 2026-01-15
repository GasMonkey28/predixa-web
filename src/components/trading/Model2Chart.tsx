'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Activity } from 'lucide-react'

interface TradingDay {
  as_of_date: string
  open_price: number | null
  high_price: number | null
  low_price: number | null
  close_price: number | null
  final_signal: string
  position_size: number
  pnl_mark: string | null
  pnl_value: number | null
  notes: string
  y1_signal?: string
  y2y3_signal?: string
}

interface Model2ChartProps {
  tradingDays: TradingDay[]
  height?: number
  chartType?: 'line' | 'candlestick'
  onChartTypeChange?: (type: 'line' | 'candlestick') => void
}

export default function Model2Chart({ 
  tradingDays, 
  height = 400, 
  chartType = 'candlestick',
  onChartTypeChange 
}: Model2ChartProps) {
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

  // Filter out days without price data
  const validDays = useMemo(() => {
    return tradingDays.filter(day => 
      day.open_price != null && 
      day.high_price != null && 
      day.low_price != null && 
      day.close_price != null
    )
  }, [tradingDays])

  const chartDimensions = useMemo(() => {
    if (!validDays.length) return { width: 0, height: 0, margin: { top: 20, right: 30, left: 50, bottom: 100 } }
    
    const margin = { top: 20, right: 30, left: 50, bottom: 100 }
    const chartWidth = containerWidth - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom
    
    return { width: chartWidth, height: chartHeight, margin }
  }, [validDays, height, containerWidth])

  const scales = useMemo(() => {
    if (!validDays.length) return { xScale: 0, yScale: 0, minPrice: 0, maxPrice: 0 }
    
    const { width, height, margin } = chartDimensions
    const minPrice = Math.min(...validDays.map(d => d.low_price!)) - 2
    const maxPrice = Math.max(...validDays.map(d => d.high_price!)) + 2
    
    const xScale = width / validDays.length
    const yScale = height / (maxPrice - minPrice)
    
    return { xScale, yScale, minPrice, maxPrice }
  }, [validDays, chartDimensions])

  const formatPrice = (price: number) => `$${price.toFixed(2)}`
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const renderCandlestick = (day: TradingDay, index: number) => {
    const { xScale, yScale } = scales
    const { width, height, margin } = chartDimensions
    
    const x = margin.left + index * xScale + xScale / 2
    const isGreen = day.close_price! >= day.open_price!
    
    const highY = margin.top + (scales.maxPrice - day.high_price!) * yScale
    const lowY = margin.top + (scales.maxPrice - day.low_price!) * yScale
    const openY = margin.top + (scales.maxPrice - day.open_price!) * yScale
    const closeY = margin.top + (scales.maxPrice - day.close_price!) * yScale
    
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
        
        {/* Open tick */}
        <line
          x1={x - halfWidth - 2}
          y1={openY}
          x2={x - halfWidth}
          y2={openY}
          stroke={isGreen ? '#10b981' : '#ef4444'}
          strokeWidth={2}
        />
        
        {/* Close tick */}
        <line
          x1={x + halfWidth}
          y1={closeY}
          x2={x + halfWidth + 2}
          y2={closeY}
          stroke={isGreen ? '#10b981' : '#ef4444'}
          strokeWidth={2}
        />
        
        {/* Signal indicator */}
        {day.final_signal && day.final_signal !== 'no_trade' && (
          <circle
            cx={x}
            cy={day.final_signal === 'long' ? highY - 15 : lowY + 15}
            r="6"
            fill={day.final_signal === 'long' ? '#10b981' : '#ef4444'}
            stroke="white"
            strokeWidth={1.5}
          />
        )}
        
        {/* PnL marker */}
        {day.pnl_value != null && (
          <g>
            <circle
              cx={x}
              cy={day.pnl_mark === 'profit' ? highY - 30 : lowY + 30}
              r="5"
              fill={day.pnl_mark === 'profit' ? '#10b981' : '#ef4444'}
              stroke="white"
              strokeWidth={1}
            />
            <text
              x={x}
              y={day.pnl_mark === 'profit' ? highY - 35 : lowY + 35}
              textAnchor="middle"
              fontSize="9"
              fill={day.pnl_mark === 'profit' ? '#10b981' : '#ef4444'}
              fontWeight="bold"
            >
              {day.pnl_value > 0 ? '+' : ''}{day.pnl_value.toFixed(0)}
            </text>
          </g>
        )}
        
        {/* Invisible hover area - expanded for better sensitivity */}
        <rect
          x={x - xScale * 0.75}
          y={margin.top - 20}
          width={xScale * 1.5}
          height={height + 40}
          fill="transparent"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ cursor: 'pointer' }}
        />
      </g>
    )
  }

  const renderLine = (day: TradingDay, index: number) => {
    const { xScale, yScale } = scales
    const { margin } = chartDimensions
    
    const x = margin.left + index * xScale + xScale / 2
    const closeY = margin.top + (scales.maxPrice - day.close_price!) * yScale
    
    return (
      <g key={index}>
        {/* Line point */}
        {index > 0 && (
          <line
            x1={margin.left + (index - 1) * xScale + xScale / 2}
            y1={margin.top + (scales.maxPrice - validDays[index - 1].close_price!) * yScale}
            x2={x}
            y2={closeY}
            stroke="#3b82f6"
            strokeWidth={2}
          />
        )}
        
        {/* Point */}
        <circle
          cx={x}
          cy={closeY}
          r="4"
          fill="#3b82f6"
          stroke="white"
          strokeWidth={1.5}
        />
        
        {/* Signal indicator */}
        {day.final_signal && day.final_signal !== 'no_trade' && (
          <circle
            cx={x}
            cy={closeY - 15}
            r="6"
            fill={day.final_signal === 'long' ? '#10b981' : '#ef4444'}
            stroke="white"
            strokeWidth={1.5}
          />
        )}
        
        {/* PnL marker */}
        {day.pnl_value != null && (
          <g>
            <circle
              cx={x}
              cy={closeY - 30}
              r="5"
              fill={day.pnl_mark === 'profit' ? '#10b981' : '#ef4444'}
              stroke="white"
              strokeWidth={1}
            />
            <text
              x={x}
              y={closeY - 35}
              textAnchor="middle"
              fontSize="9"
              fill={day.pnl_mark === 'profit' ? '#10b981' : '#ef4444'}
              fontWeight="bold"
            >
              {day.pnl_value > 0 ? '+' : ''}{day.pnl_value.toFixed(0)}
            </text>
          </g>
        )}
        
        {/* Invisible hover area - expanded for better sensitivity */}
        <rect
          x={x - xScale * 0.75}
          y={margin.top - 20}
          width={xScale * 1.5}
          height={chartDimensions.height + 40}
          fill="transparent"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ cursor: 'pointer' }}
        />
      </g>
    )
  }

  const renderGrid = () => {
    const { width, height, margin } = chartDimensions
    const { minPrice, maxPrice } = scales
    
    const gridLines = []
    const priceRange = maxPrice - minPrice
    const numHorizontalLines = 5
    
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
    const step = Math.max(1, Math.floor(validDays.length / 8))
    
    for (let i = 0; i < validDays.length; i += step) {
      const x = margin.left + i * xScale + xScale / 2
      const label = formatDate(validDays[i].as_of_date)
      
      labels.push(
        <text
          key={`x-label-${i}`}
          x={x}
          y={margin.top + height + 20}
          textAnchor="middle"
          fontSize="11"
          fill="currentColor"
          className="text-gray-600 dark:text-gray-400"
        >
          {label}
        </text>
      )
    }
    
    return labels
  }

  const renderSignalLabels = () => {
    const { width, height, margin } = chartDimensions
    const { xScale } = scales
    
    const labels = []
    
    for (let i = 0; i < validDays.length; i++) {
      const day = validDays[i]
      if (!day.final_signal || day.final_signal === 'no_trade') continue
      
      const x = margin.left + i * xScale + xScale / 2
      const signalLabelY = margin.top + height + 40
      
      labels.push(
        <g key={`signal-label-${i}`}>
          <text
            x={x}
            y={signalLabelY}
            textAnchor="middle"
            fontSize="10"
            fill={day.final_signal === 'long' ? '#10b981' : '#ef4444'}
            fontWeight="bold"
          >
            {day.final_signal.toUpperCase()}
          </text>
          {day.position_size !== 0 && (
            <text
              x={x}
              y={signalLabelY + 12}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              className="text-gray-500 dark:text-gray-400"
            >
              {day.position_size > 0 ? `+${day.position_size}` : day.position_size}
            </text>
          )}
        </g>
      )
    }
    
    return labels
  }

  const renderTooltip = () => {
    if (hoveredIndex === null || !validDays[hoveredIndex]) return null
    
    const day = validDays[hoveredIndex]
    const { xScale } = scales
    const { margin, width } = chartDimensions
    const x = margin.left + hoveredIndex * xScale + xScale / 2
    
    // Calculate tooltip position to avoid edge clipping
    const tooltipWidth = 220
    const tooltipOffset = 10
    const totalChartWidth = margin.left + width + margin.right
    
    // Check if tooltip would overflow on the right
    const tooltipRightX = x + tooltipOffset + tooltipWidth
    const wouldOverflowRight = tooltipRightX > totalChartWidth
    
    // Check if tooltip would overflow on the left if positioned to the left
    const tooltipLeftX = x - tooltipOffset - tooltipWidth
    const wouldOverflowLeft = tooltipLeftX < 0
    
    // Determine tooltip X position
    let tooltipX: number
    if (wouldOverflowRight && !wouldOverflowLeft) {
      // Position to the left of the bar
      tooltipX = x - tooltipOffset - tooltipWidth
    } else {
      // Position to the right of the bar (default)
      tooltipX = x + tooltipOffset
    }
    
    // Ensure tooltip doesn't go below 0 (left edge)
    tooltipX = Math.max(0, tooltipX)
    
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
          x={tooltipX}
          y={margin.top + 10}
          width={220}
          height={day.notes ? 180 : 150}
          fill="rgba(17, 24, 39, 0.95)"
          stroke="#374151"
          strokeWidth={1}
          rx={4}
          className="backdrop-blur-sm"
        />
        
        {/* Tooltip content */}
        <text x={tooltipX + 10} y={margin.top + 30} fontSize="13" fontWeight="bold" fill="#f3f4f6">
          {formatDate(day.as_of_date)}
        </text>
        
        <text x={tooltipX + 10} y={margin.top + 50} fontSize="11" fill="#9ca3af">
          Open: <tspan fill="#f3f4f6" fontFamily="monospace">{formatPrice(day.open_price!)}</tspan>
        </text>
        
        <text x={tooltipX + 10} y={margin.top + 65} fontSize="11" fill="#9ca3af">
          High: <tspan fill="#10b981" fontFamily="monospace">{formatPrice(day.high_price!)}</tspan>
        </text>
        
        <text x={tooltipX + 10} y={margin.top + 80} fontSize="11" fill="#9ca3af">
          Low: <tspan fill="#ef4444" fontFamily="monospace">{formatPrice(day.low_price!)}</tspan>
        </text>
        
        <text x={tooltipX + 10} y={margin.top + 95} fontSize="11" fill="#9ca3af">
          Close: <tspan fill="#3b82f6" fontFamily="monospace">{formatPrice(day.close_price!)}</tspan>
        </text>
        
        <text x={tooltipX + 10} y={margin.top + 115} fontSize="11" fill="#9ca3af">
          Signal: <tspan fill={day.final_signal === 'long' ? '#10b981' : day.final_signal === 'short' ? '#ef4444' : '#9ca3af'} fontWeight="bold">
            {day.final_signal.toUpperCase()}
          </tspan>
          {day.position_size !== 0 && (
            <tspan fill="#f3f4f6"> ({day.position_size > 0 ? '+' : ''}{day.position_size})</tspan>
          )}
        </text>
        
        {day.pnl_value != null && (
          <text x={tooltipX + 10} y={margin.top + 135} fontSize="11" fill="#9ca3af">
            PnL: <tspan fill={day.pnl_mark === 'profit' ? '#10b981' : '#ef4444'} fontWeight="bold" fontFamily="monospace">
              {day.pnl_value > 0 ? '+' : ''}{day.pnl_value.toFixed(2)}
            </tspan>
          </text>
        )}
        
        {day.notes && (
          <text x={tooltipX + 10} y={margin.top + 155} fontSize="10" fill="#6b7280" width={200}>
            {day.notes.length > 50 ? day.notes.substring(0, 50) + '...' : day.notes}
          </text>
        )}
      </g>
    )
  }

  if (!validDays.length) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <div className="text-gray-500">No price data available</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6"
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-zinc-200">Price Chart</h3>
          </div>
          
          {onChartTypeChange && (
            <div className="flex gap-2">
              <button
                onClick={() => onChartTypeChange('line')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartType === 'line'
                    ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Line Chart
              </button>
              <button
                onClick={() => onChartTypeChange('candlestick')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartType === 'candlestick'
                    ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Candlestick
              </button>
            </div>
          )}
        </div>

        {/* Chart */}
        <div ref={containerRef} className="w-full">
          <svg width="100%" height={height}>
            {/* Grid */}
            {renderGrid()}
            
            {/* Chart */}
            {chartType === 'candlestick' 
              ? validDays.map((day, index) => renderCandlestick(day, index))
              : validDays.map((day, index) => renderLine(day, index))
            }
            
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
            
            {/* X-axis labels */}
            {renderXAxisLabels()}
            
            {/* Signal labels */}
            {renderSignalLabels()}
            
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
      </div>
    </motion.div>
  )
}
