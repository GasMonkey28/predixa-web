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
          // If error in response, treat as no data
          setEvents([])
          setError(null)
          setLoading(false)
          return
        }
        
        // Get today's date in YYYY-MM-DD format for filtering
        const today = new Date().toISOString().split('T')[0]
        
        // Transform the API data to match our interface and filter to today only
        const transformedEvents: EconomicEvent[] = eventsArray
          .filter((event: any) => {
            // Filter events to only show today's events
            const eventDate = event.date || event.datetime || event.time
            if (!eventDate) return false // Skip events without dates
            
            // Try to parse the date in various formats
            let eventDateStr = ''
            if (typeof eventDate === 'string') {
              // Extract date from datetime strings like "2024-01-15T08:30:00" or "2024-01-15"
              eventDateStr = eventDate.split('T')[0]
            } else if (eventDate instanceof Date) {
              eventDateStr = eventDate.toISOString().split('T')[0]
            }
            
            // Only include events for today
            return eventDateStr === today
          })
          .map((event: any, index: number) => {
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
        
        console.log('Transformed events (filtered to today):', transformedEvents)
        
        // Set events (even if empty) and clear any errors
        setEvents(transformedEvents)
        setLastUpdated(new Date())
        setError(null) // Clear any previous errors
      } catch (err) {
        console.error('Failed to fetch economic calendar:', err)
        // On error, just show no data - don't set error state or use mock data
        setEvents([])
        setError(null)
        setLastUpdated(null)
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
        setEvents([])
        setLastUpdated(null)
        setLoading(false)
        return
      }
      
      // Get today's date in YYYY-MM-DD format for filtering
      const today = new Date().toISOString().split('T')[0]
      
      // Transform the API data and filter to today only
      const transformedEvents: EconomicEvent[] = eventsArray
        .filter((event: any) => {
          // Filter events to only show today's events
          const eventDate = event.date || event.datetime || event.time
          if (!eventDate) return false // Skip events without dates
          
          // Try to parse the date in various formats
          let eventDateStr = ''
          if (typeof eventDate === 'string') {
            // Extract date from datetime strings like "2024-01-15T08:30:00" or "2024-01-15"
            eventDateStr = eventDate.split('T')[0]
          } else if (eventDate instanceof Date) {
            eventDateStr = eventDate.toISOString().split('T')[0]
          }
          
          // Only include events for today
          return eventDateStr === today
        })
        .map((event: any, index: number) => {
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
      
      setEvents(transformedEvents)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to refresh economic calendar:', err)
      // On error, just show no data
      setEvents([])
      setError(null)
      setLastUpdated(null)
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          {lastUpdated && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Impact Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Impact:</span>
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
      {events.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No data available
        </div>
      ) : filteredEvents.length === 0 ? (
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

      {/* Warning Notice - Only show when there are events */}
      {events.length > 0 && (
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
      )}
    </div>
  )
}
