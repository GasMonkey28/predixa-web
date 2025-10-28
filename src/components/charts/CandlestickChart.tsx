'use client'

import { useState, useMemo, useEffect, useRef } from 'react'

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
    if (!data.length) return { width: 0, height: 0, margin: { top: 20, right: 30, left: 50, bottom: 40 } }
    
    const margin = { top: 20, right: 30, left: 50, bottom: 40 }
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
    
    for (let i = 0; i < data.length; i += step) {
      const x = margin.left + i * xScale + xScale / 2
      const label = data[i].time
      
      labels.push(
        <text
          key={`x-label-${i}`}
          x={x}
          y={margin.top + height + margin.bottom - 5}
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
