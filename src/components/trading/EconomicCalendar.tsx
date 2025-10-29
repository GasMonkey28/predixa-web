'use client'

import { useState, useEffect } from 'react'

interface EconomicEvent {
  id: string
  time: string
  event: string
  impact: number // 1-3 (Low, Medium, High)
  actual?: string
  forecast?: string
  previous?: string
}

interface EconomicCalendarProps {
  minImpact?: number
}

export default function EconomicCalendar({ minImpact = 0 }: EconomicCalendarProps) {
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImpact, setSelectedImpact] = useState(minImpact)

  useEffect(() => {
    async function fetchEvents() {
      try {
        // Mock data based on your Swift implementation
        const mockEvents: EconomicEvent[] = [
          {
            id: '1',
            time: '08:30',
            event: 'Consumer Price Index (CPI)',
            impact: 3,
            actual: '3.2%',
            forecast: '3.1%',
            previous: '3.0%'
          },
          {
            id: '2',
            time: '10:00',
            event: 'Consumer Sentiment Index',
            impact: 2,
            forecast: '68.5',
            previous: '67.2'
          },
          {
            id: '3',
            time: '14:00',
            event: 'Federal Reserve Chair Speech',
            impact: 3,
            actual: 'Dovish tone'
          },
          {
            id: '4',
            time: '16:00',
            event: 'Industrial Production',
            impact: 2,
            forecast: '0.3%',
            previous: '0.1%'
          },
          {
            id: '5',
            time: '08:30',
            event: 'Retail Sales',
            impact: 2,
            forecast: '0.5%',
            previous: '0.3%'
          }
        ]
        
        setEvents(mockEvents)
      } catch (err) {
        setError('Failed to load economic calendar')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const getImpactColor = (impact: number) => {
    switch (impact) {
      case 3: return 'text-red-600'
      case 2: return 'text-yellow-600'
      case 1: return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getImpactBgColor = (impact: number) => {
    switch (impact) {
      case 3: return 'bg-red-500'
      case 2: return 'bg-yellow-500'
      case 1: return 'bg-green-500'
      default: return 'bg-gray-400'
    }
  }

  const getImpactDots = (impact: number) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${
              i < impact ? getImpactBgColor(impact) : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    )
  }

  const getValueComparison = (actual?: string, forecast?: string) => {
    if (!actual || !forecast) return null
    
    // Simple comparison logic (you'd want more sophisticated parsing)
    const actualNum = parseFloat(actual.replace('%', ''))
    const forecastNum = parseFloat(forecast.replace('%', ''))
    
    if (isNaN(actualNum) || isNaN(forecastNum)) return null
    
    if (actualNum > forecastNum) {
      return { color: 'text-green-600', symbol: '▲' }
    } else if (actualNum < forecastNum) {
      return { color: 'text-red-600', symbol: '▼' }
    }
    return { color: 'text-gray-600', symbol: '=' }
  }

  const filteredEvents = events.filter(event => event.impact >= selectedImpact)

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
        <div className="text-center text-red-600 dark:text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold dark:text-white">Economic Calendar</h2>
        
        {/* Impact Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Min Impact:</span>
          <select
            value={selectedImpact}
            onChange={(e) => setSelectedImpact(Number(e.target.value))}
            className="text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1"
          >
            <option value={0}>All Events</option>
            <option value={1}>Low+ (1+)</option>
            <option value={2}>Medium+ (2+)</option>
            <option value={3}>High (3)</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No events {selectedImpact > 0 ? `with impact ≥ ${selectedImpact}` : ''} today
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const comparison = getValueComparison(event.actual, event.forecast)
            
            return (
              <div key={event.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {event.time}
                    </span>
                    {getImpactDots(event.impact)}
                  </div>
                </div>

                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {event.event}
                </h3>

                {/* Event Data */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {event.actual && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Actual: </span>
                      <span className={`font-mono ${comparison?.color || 'text-gray-900 dark:text-gray-100'}`}>
                        {event.actual}
                      </span>
                      {comparison && (
                        <span className={`ml-1 ${comparison.color}`}>
                          {comparison.symbol}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {event.forecast && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Forecast: </span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">
                        {event.forecast}
                      </span>
                    </div>
                  )}
                  
                  {event.previous && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Previous: </span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">
                        {event.previous}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Warning Notice */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-orange-600 dark:text-orange-400">⚠️</span>
          <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
            High-Impact Events Warning
          </h3>
        </div>
        <p className="text-sm text-orange-700 dark:text-orange-400">
          High-impact events (3 dots) like FOMC meetings, CPI reports, and NFP can cause extreme volatility 
          that may override trading signals. Consider reducing position sizes around major announcements.
        </p>
      </div>
    </div>
  )
}
