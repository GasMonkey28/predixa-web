'use client'

import { useState, useEffect } from 'react'
import { fetchEconomicCalendarInvesting } from '@/lib/api'

interface EconomicEvent {
  id: string
  time: string
  event: string
  impact: number // 1-3 (Low, Medium, High)
  country?: string
  actual?: string | null
  forecast?: string | null
  previous?: string | null
}

interface EconomicCalendarInvestingProps {
  minImpact?: number
}

export default function EconomicCalendarInvesting({ minImpact = 2 }: EconomicCalendarInvestingProps) {
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImpact, setSelectedImpact] = useState(minImpact)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        console.log('Fetching Investing.com economic calendar data from API...')
        const data = await fetchEconomicCalendarInvesting()
        console.log('Investing.com economic calendar data received:', data)
        
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
            if (eventName.includes('fed') || eventName.includes('fomc') || eventName.includes('rate') || eventName.includes('cpi') || eventName.includes('gdp') || eventName.includes('payroll') || eventName.includes('unemployment') || eventName.includes('nfp')) {
              impact = 3 // High impact for major economic indicators
            } else if (eventName.includes('mortgage') || eventName.includes('inventory')) {
              impact = 1 // Low impact for secondary indicators
            }
          }
          
          // Helper to normalize value - handle empty strings, null, undefined
          // IMPORTANT: Do NOT fill missing actual/forecast with previous values
          const normalizeValue = (val: any): string | null => {
            if (val === null || val === undefined) return null
            const str = String(val).trim()
            if (str === '' || str === '-' || str === 'TBD' || str === 'N/A' || str === 'null' || str === 'undefined') return null
            return str
          }
          
          // Extract values separately - do NOT use fallback to previous
          const actual = normalizeValue(event.actual || event.actual_value)
          const forecast = normalizeValue(event.forecast || event.forecast_value)
          const previous = normalizeValue(event.previous || event.previous_value)
          
          // Additional validation: ensure actual and forecast are not accidentally set to previous
          // If actual/forecast equals previous and they shouldn't be the same, it might be a data issue
          // But we'll still allow it if it's a legitimate match (e.g., rate stays the same)
          
          return {
            id: event.id || event.event_id || `investing-event-${index}`,
            time: event.time || event.datetime || event.release_time || '08:30',
            event: event.event || event.title || event.name || event.description || 'Unknown Event',
            impact: impact,
            country: event.country || 'US',
            actual: actual, // Only set if actual value exists, never fallback to previous
            forecast: forecast, // Only set if forecast value exists, never fallback to previous
            previous: previous
          }
        })
        
        console.log('Transformed events:', transformedEvents)
        
        // Handle empty events array gracefully - show message instead of error
        if (transformedEvents.length === 0) {
          console.warn('No events found in Investing.com API response')
          setEvents([])
          setLastUpdated(new Date())
          setError(null) // Don't set error for empty results, just show empty state
          setLoading(false)
          return
        }
        
        setEvents(transformedEvents)
        setLastUpdated(new Date())
        setError(null) // Clear any previous errors
      } catch (err) {
        console.error('Failed to fetch Investing.com economic calendar:', err)
        setError(`Failed to load Investing.com economic calendar: ${err instanceof Error ? err.message : 'Unknown error'}`)
        // Don't show mock data - let the API's fallback data be shown instead
        setEvents([])
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
      console.log('Refreshing Investing.com economic calendar data...')
      const data = await fetchEconomicCalendarInvesting()
      console.log('Refreshed Investing.com economic calendar data:', data)
      
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
          if (eventName.includes('fed') || eventName.includes('fomc') || eventName.includes('rate') || eventName.includes('cpi') || eventName.includes('gdp') || eventName.includes('payroll') || eventName.includes('unemployment') || eventName.includes('nfp')) {
            impact = 3 // High impact for major economic indicators
          } else if (eventName.includes('mortgage') || eventName.includes('inventory')) {
            impact = 1 // Low impact for secondary indicators
          }
        }
        
        // Helper to normalize value - handle empty strings, null, undefined
        // IMPORTANT: Do NOT fill missing actual/forecast with previous values
        const normalizeValue = (val: any): string | null => {
          if (val === null || val === undefined) return null
          const str = String(val).trim()
          if (str === '' || str === '-' || str === 'TBD' || str === 'N/A' || str === 'null' || str === 'undefined') return null
          return str
        }
        
        // Extract values separately - do NOT use fallback to previous
        const actual = normalizeValue(event.actual || event.actual_value)
        const forecast = normalizeValue(event.forecast || event.forecast_value)
        const previous = normalizeValue(event.previous || event.previous_value)
        
        return {
          id: event.id || event.event_id || `investing-event-${index}`,
          time: event.time || event.datetime || event.release_time || '08:30',
          event: event.event || event.title || event.name || event.description || 'Unknown Event',
          impact: impact,
          country: event.country || 'US',
          actual: actual, // Only set if actual value exists, never fallback to previous
          forecast: forecast, // Only set if forecast value exists, never fallback to previous
          previous: previous
        }
      })
      
      // Handle empty events array gracefully
      if (transformedEvents.length === 0) {
        console.warn('No events found in Investing.com API response')
        setEvents([])
        setLastUpdated(new Date())
        return
      }
      
      setEvents(transformedEvents)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to refresh Investing.com economic calendar:', err)
      setError(`Failed to refresh Investing.com economic calendar: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
              i < impact ? getImpactBgColor(impact) : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    )
  }

  // Helper function to check if an event has been released (time has passed)
  const isEventReleased = (eventTime: string): boolean => {
    try {
      // Parse the event time (format: "HH:MM" or "HH:MM:SS")
      const [hours, minutes] = eventTime.split(':').map(Number)
      if (isNaN(hours) || isNaN(minutes)) return false
      
      // Get current time in ET (Eastern Time) since economic events are typically in ET
      const now = new Date()
      const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const currentHours = etTime.getHours()
      const currentMinutes = etTime.getMinutes()
      
      // Compare times
      if (currentHours > hours) return true
      if (currentHours === hours && currentMinutes >= minutes) return true
      return false
    } catch {
      // If parsing fails, assume not released to be safe
      return false
    }
  }

  // Helper function to check if actual value is likely mock data (same as forecast or previous)
  const isActualMockData = (actual: string | null, forecast?: string | null, previous?: string | null): boolean => {
    if (!actual) return false
    // If actual equals forecast or previous, it's likely mock data
    return actual === forecast || actual === previous
  }

  const getValueComparison = (actual?: string | null, forecast?: string | null, previous?: string | null) => {
    if (!actual) return null
    
    // Helper to parse numeric value from string
    const parseValue = (val: string): number | null => {
      try {
        return parseFloat(val.replace('%', '').replace('K', '').replace('M', '').replace(',', ''))
      } catch {
        return null
      }
    }
    
    // Priority 1: Compare actual vs forecast if forecast exists
    if (forecast) {
      const actualNum = parseValue(actual)
      const forecastNum = parseValue(forecast)
      
      if (actualNum !== null && forecastNum !== null && !isNaN(actualNum) && !isNaN(forecastNum)) {
        if (actualNum > forecastNum) {
          return { color: 'text-green-400', symbol: '▲' }
        } else if (actualNum < forecastNum) {
          return { color: 'text-red-400', symbol: '▼' }
        }
        return { color: 'text-blue-400', symbol: '=' }
      }
    }
    
    // Priority 2: If no forecast, compare actual vs previous
    if (previous) {
      const actualNum = parseValue(actual)
      const previousNum = parseValue(previous)
      
      if (actualNum !== null && previousNum !== null && !isNaN(actualNum) && !isNaN(previousNum)) {
        if (actualNum > previousNum) {
          return { color: 'text-green-400', symbol: '▲' }
        } else if (actualNum < previousNum) {
          return { color: 'text-red-400', symbol: '▼' }
        }
        return { color: 'text-blue-400', symbol: '=' }
      }
    }
    
    // If no comparison possible, return null (will default to blue)
    return null
  }

  const filteredEvents = events.filter(event => event.impact >= selectedImpact)

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <div className="text-lg font-semibold mb-2">⚠️ Investing.com Economic Calendar Error</div>
            <div className="text-sm">{error}</div>
          </div>
          <button
            onClick={refreshEvents}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Retrying...' : 'Retry'}
          </button>
          <div className="mt-4 text-sm text-gray-400">
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
          <h2 className="text-lg font-semibold text-white mb-1">Economic Calendar</h2>
          {lastUpdated && (
            <p className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Impact Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Impact:</span>
            <select
              value={selectedImpact}
              onChange={(e) => setSelectedImpact(Number(e.target.value))}
              className="text-sm border border-gray-600 bg-gray-800 text-white rounded px-2 py-1"
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
        <div className="text-center text-gray-400 py-8">
          No events {selectedImpact > 0 ? `with impact ≥ ${selectedImpact}` : ''} today
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            // Check if event has been released
            const eventReleased = isEventReleased(event.time)
            
            // If event hasn't been released yet, check if actual is likely mock data (same as forecast/previous)
            // If event has been released, show actual even if it matches forecast/previous (could be legitimate)
            const actualIsMock = !eventReleased && isActualMockData(event.actual ?? null, event.forecast ?? null, event.previous ?? null)
            
            // Only show actual if event has been released AND actual is not mock data
            const shouldShowActual = eventReleased && event.actual && !actualIsMock
            
            const comparison = shouldShowActual ? getValueComparison(event.actual, event.forecast, event.previous) : null
            
            return (
              <div key={event.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-300 bg-gray-800 px-2 py-1 rounded">
                      {event.time}
                    </span>
                    {getImpactDots(event.impact)}
                  </div>
                </div>

                <h3 className="text-sm font-medium text-white mb-3">
                  {event.event}
                </h3>

                {/* Event Data - Always show 3-column layout for alignment, but only show values if they exist */}
                {(event.previous || event.actual || event.forecast) && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {/* Actual - Always show label, only show value if event has been released and actual is real */}
                    <div>
                      <div className="text-gray-400 text-xs mb-1">Actual</div>
                      {shouldShowActual ? (
                        <div className={`font-mono flex items-center gap-1 font-semibold ${comparison?.color || 'text-blue-400'}`}>
                          {event.actual}
                          {comparison ? (
                            <span className={comparison.color}>
                              {comparison.symbol}
                            </span>
                          ) : (
                            <span className="text-blue-400">▲</span>
                          )}
                        </div>
                      ) : (
                        <div className="font-mono text-gray-500 text-sm">-</div>
                      )}
                    </div>
                    
                    {/* Forecast - Always show label, only show value if it exists (no fake data) */}
                    <div>
                      <div className="text-gray-400 text-xs mb-1">Forecast</div>
                      {event.forecast ? (
                        <div className="font-mono text-gray-200 font-medium">
                          {event.forecast}
                        </div>
                      ) : (
                        <div className="font-mono text-gray-500 text-sm">-</div>
                      )}
                    </div>
                    
                    {/* Previous - Always show label, only show value if it exists */}
                    <div>
                      <div className="text-gray-400 text-xs mb-1">Previous</div>
                      {event.previous ? (
                        <div className="font-mono text-gray-200 font-medium">
                          {event.previous}
                        </div>
                      ) : (
                        <div className="font-mono text-gray-500 text-sm">-</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}


