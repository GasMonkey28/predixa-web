'use client'

import { useState, useEffect } from 'react'
import { fetchEconomicCalendar } from '@/lib/api'

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        console.log('Fetching economic calendar data from API...')
        const data = await fetchEconomicCalendar()
        console.log('Economic calendar data received:', data)
        
        // Handle different possible API response structures
        let eventsArray = []
        if (Array.isArray(data)) {
          eventsArray = data
        } else if (data.events && Array.isArray(data.events)) {
          eventsArray = data.events
        } else if (data.data && Array.isArray(data.data)) {
          eventsArray = data.data
        } else {
          console.warn('Unexpected API response structure:', data)
          throw new Error('Invalid API response structure')
        }
        
        // Transform the API data to match our interface
        const transformedEvents: EconomicEvent[] = eventsArray.map((event: any, index: number) => {
          console.log(`Event ${index}:`, {
            originalImpact: event.impact,
            eventTitle: event.event || event.title || event.name || event.description
          })
          
          // More intelligent impact mapping
          let impact = 2 // Default to medium
          if (event.impact === 'high' || event.impact === 3) {
            impact = 3
          } else if (event.impact === 'medium' || event.impact === 2) {
            impact = 2
          } else if (event.impact === 'low' || event.impact === 1) {
            impact = 1
          } else {
            // For unknown impact, try to infer from event name
            const eventName = (event.event || event.title || event.name || '').toLowerCase()
            if (eventName.includes('fed') || eventName.includes('fomc') || eventName.includes('rate') || eventName.includes('cpi') || eventName.includes('gdp')) {
              impact = 3 // High impact for major economic indicators
            } else if (eventName.includes('mortgage') || eventName.includes('inventory') || eventName.includes('sales')) {
              impact = 1 // Low impact for secondary indicators
            }
          }
          
          return {
            id: event.id || event.event_id || `event-${index}`,
            time: event.time || event.datetime || event.release_time || 'TBD',
            event: event.event || event.title || event.name || event.description || 'Unknown Event',
            impact: impact,
            actual: event.actual || event.actual_value,
            forecast: event.forecast || event.forecast_value,
            previous: event.previous || event.previous_value
          }
        })
        
        console.log('Transformed events:', transformedEvents)
        
        if (transformedEvents.length === 0) {
          console.warn('No events found in API response')
          throw new Error('No events found')
        }
        
        setEvents(transformedEvents)
        setLastUpdated(new Date())
        setError(null) // Clear any previous errors
      } catch (err) {
        console.error('Failed to fetch economic calendar:', err)
        setError(`Failed to load economic calendar: ${err instanceof Error ? err.message : 'Unknown error'}`)
        
        // Fallback to mock data if API fails
        console.log('Using fallback mock data')
        const today = new Date()
        const isAfterHours = today.getHours() > 16
        
        const mockEvents: EconomicEvent[] = [
          {
            id: '1',
            time: '08:30',
            event: 'Consumer Price Index (CPI)',
            impact: 3,
            actual: isAfterHours ? '3.2%' : undefined,
            forecast: '3.1%',
            previous: '3.0%'
          },
          {
            id: '2',
            time: '10:00',
            event: 'Consumer Sentiment Index',
            impact: 2,
            actual: isAfterHours ? '68.5' : undefined,
            forecast: '68.5',
            previous: '67.2'
          },
          {
            id: '3',
            time: '14:00',
            event: 'Federal Reserve Chair Speech',
            impact: 3,
            actual: isAfterHours ? 'Dovish tone' : undefined
          },
          {
            id: '4',
            time: '16:00',
            event: 'Industrial Production',
            impact: 2,
            actual: isAfterHours ? '0.3%' : undefined,
            forecast: '0.3%',
            previous: '0.1%'
          },
          {
            id: '5',
            time: '08:30',
            event: 'Retail Sales',
            impact: 2,
            actual: isAfterHours ? '0.5%' : undefined,
            forecast: '0.5%',
            previous: '0.3%'
          },
          {
            id: '6',
            time: '10:30',
            event: 'Crude Oil Inventories',
            impact: 2,
            forecast: '-2.1M',
            previous: '-1.8M'
          },
          {
            id: '7',
            time: '12:00',
            event: 'Fed Funds Rate Decision',
            impact: 3,
            forecast: '5.25%',
            previous: '5.25%'
          },
          {
            id: '8',
            time: '09:00',
            event: 'MBA Mortgage Applications',
            impact: 1,
            forecast: '2.1%',
            previous: '1.8%'
          },
          {
            id: '9',
            time: '11:00',
            event: 'Wholesale Inventories',
            impact: 1,
            forecast: '0.2%',
            previous: '0.1%'
          }
        ]
        setEvents(mockEvents)
        setLastUpdated(new Date())
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const refreshEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Refreshing economic calendar data...')
      const data = await fetchEconomicCalendar()
      console.log('Refreshed economic calendar data:', data)
      
      // Handle different possible API response structures
      let eventsArray = []
      if (Array.isArray(data)) {
        eventsArray = data
      } else if (data.events && Array.isArray(data.events)) {
        eventsArray = data.events
      } else if (data.data && Array.isArray(data.data)) {
        eventsArray = data.data
      } else {
        console.warn('Unexpected API response structure:', data)
        throw new Error('Invalid API response structure')
      }
      
      const transformedEvents: EconomicEvent[] = eventsArray.map((event: any, index: number) => {
        // More intelligent impact mapping
        let impact = 2 // Default to medium
        if (event.impact === 'high' || event.impact === 3) {
          impact = 3
        } else if (event.impact === 'medium' || event.impact === 2) {
          impact = 2
        } else if (event.impact === 'low' || event.impact === 1) {
          impact = 1
        } else {
          // For unknown impact, try to infer from event name
          const eventName = (event.event || event.title || event.name || '').toLowerCase()
          if (eventName.includes('fed') || eventName.includes('fomc') || eventName.includes('rate') || eventName.includes('cpi') || eventName.includes('gdp')) {
            impact = 3 // High impact for major economic indicators
          } else if (eventName.includes('mortgage') || eventName.includes('inventory') || eventName.includes('sales')) {
            impact = 1 // Low impact for secondary indicators
          }
        }
        
        return {
          id: event.id || event.event_id || `event-${index}`,
          time: event.time || event.datetime || event.release_time || 'TBD',
          event: event.event || event.title || event.name || event.description || 'Unknown Event',
          impact: impact,
          actual: event.actual || event.actual_value,
          forecast: event.forecast || event.forecast_value,
          previous: event.previous || event.previous_value
        }
      })
      
      if (transformedEvents.length === 0) {
        console.warn('No events found in API response')
        throw new Error('No events found')
      }
      
      setEvents(transformedEvents)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to refresh economic calendar:', err)
      setError(`Failed to refresh economic calendar: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

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
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <div className="text-lg font-semibold mb-2">⚠️ Economic Calendar Error</div>
            <div className="text-sm">{error}</div>
          </div>
          <button
            onClick={refreshEvents}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Retrying...' : 'Retry'}
          </button>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing sample data below
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold dark:text-white">Economic Calendar</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={refreshEvents}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '🔄' : '🔄'} Refresh
          </button>
          
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
