'use client'

import { useState, useEffect } from 'react'
import { fetchEconomicCalendarFred } from '@/lib/api'

interface EconomicEvent {
  id: string
  time: string
  event: string
  impact: number // 1-3 (Low, Medium, High)
  releaseDate?: string
  releaseId?: string | null
}

interface EconomicCalendarFredProps {
  minImpact?: number
}

export default function EconomicCalendarFred({ minImpact = 0 }: EconomicCalendarFredProps) {
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImpact, setSelectedImpact] = useState(minImpact)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        console.log('Fetching FRED economic calendar data from API...')
        const data = await fetchEconomicCalendarFred()
        console.log('FRED economic calendar data received:', data)
        
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
            if (eventName.includes('fed') || eventName.includes('fomc') || eventName.includes('rate') || eventName.includes('cpi') || eventName.includes('gdp') || eventName.includes('payroll') || eventName.includes('unemployment')) {
              impact = 3 // High impact for major economic indicators
            } else if (eventName.includes('mortgage') || eventName.includes('inventory') || eventName.includes('sales')) {
              impact = 1 // Low impact for secondary indicators
            }
          }
          
          return {
            id: event.id || event.event_id || `fred-event-${index}`,
            time: event.time || event.datetime || event.release_time || '08:30',
            event: event.event || event.title || event.name || event.description || 'Unknown Event',
            impact: impact,
            releaseDate: event.releaseDate || event.release_date,
            releaseId: event.releaseId || event.release_id
          }
        })
        
        console.log('Transformed events:', transformedEvents)
        
        // Handle empty events array gracefully - show message instead of error
        if (transformedEvents.length === 0) {
          console.warn('No events found in FRED API response')
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
        console.error('Failed to fetch FRED economic calendar:', err)
        setError(`Failed to load FRED economic calendar: ${err instanceof Error ? err.message : 'Unknown error'}`)
        
        // Fallback to mock data if API fails
        console.log('Using fallback mock data for FRED calendar')
        const today = new Date()
        const isAfterHours = today.getHours() > 16
        
        const mockEvents: EconomicEvent[] = [
          {
            id: 'fred-1',
            time: '08:30',
            event: 'Consumer Price Index (CPI) - FRED',
            impact: 3,
            releaseDate: today.toISOString().split('T')[0]
          },
          {
            id: 'fred-2',
            time: '10:00',
            event: 'Gross Domestic Product (GDP) - FRED',
            impact: 3,
            releaseDate: new Date(today.getTime() + 86400000).toISOString().split('T')[0]
          },
          {
            id: 'fred-3',
            time: '14:00',
            event: 'Federal Funds Rate - FRED',
            impact: 3,
            releaseDate: new Date(today.getTime() + 172800000).toISOString().split('T')[0]
          },
          {
            id: 'fred-4',
            time: '08:30',
            event: 'Industrial Production Index - FRED',
            impact: 2,
            releaseDate: new Date(today.getTime() + 259200000).toISOString().split('T')[0]
          },
          {
            id: 'fred-5',
            time: '08:30',
            event: 'Retail Sales - FRED',
            impact: 2,
            releaseDate: new Date(today.getTime() + 345600000).toISOString().split('T')[0]
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
      console.log('Refreshing FRED economic calendar data...')
      const data = await fetchEconomicCalendarFred()
      console.log('Refreshed FRED economic calendar data:', data)
      
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
          if (eventName.includes('fed') || eventName.includes('fomc') || eventName.includes('rate') || eventName.includes('cpi') || eventName.includes('gdp') || eventName.includes('payroll') || eventName.includes('unemployment')) {
            impact = 3 // High impact for major economic indicators
          } else if (eventName.includes('mortgage') || eventName.includes('inventory') || eventName.includes('sales')) {
            impact = 1 // Low impact for secondary indicators
          }
        }
        
        return {
          id: event.id || event.event_id || `fred-event-${index}`,
          time: event.time || event.datetime || event.release_time || '08:30',
          event: event.event || event.title || event.name || event.description || 'Unknown Event',
          impact: impact,
          releaseDate: event.releaseDate || event.release_date,
          releaseId: event.releaseId || event.release_id
        }
      })
      
      // Handle empty events array gracefully
      if (transformedEvents.length === 0) {
        console.warn('No events found in FRED API response')
        setEvents([])
        setLastUpdated(new Date())
        return
      }
      
      setEvents(transformedEvents)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to refresh FRED economic calendar:', err)
      setError(`Failed to refresh FRED economic calendar: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
            <div className="text-lg font-semibold mb-2">⚠️ FRED Economic Calendar Error</div>
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">FRED Economic Calendar</h2>
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
      {filteredEvents.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No events {selectedImpact > 0 ? `with impact ≥ ${selectedImpact}` : ''} in the next 7 days
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            return (
              <div key={event.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {event.time}
                    </span>
                    {getImpactDots(event.impact)}
                  </div>
                  {event.releaseDate && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(event.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {event.event}
                </h3>

                {event.releaseId && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Release ID: {event.releaseId}
                  </div>
                )}
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
            FRED Economic Data Releases
          </h3>
        </div>
        <p className="text-sm text-orange-700 dark:text-orange-400">
          This calendar shows economic data releases from the Federal Reserve Economic Data (FRED) database. 
          High-impact events (3 dots) like GDP, CPI, and unemployment data can cause significant market volatility.
        </p>
      </div>
    </div>
  )
}


