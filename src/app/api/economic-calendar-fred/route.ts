import { NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const FRED_API_KEY = config.fred.apiKey
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred'

export async function GET(request: Request) {
  try {
    // Check if FRED API key is configured
    if (!FRED_API_KEY) {
      console.error('FRED_API_KEY is not configured')
      return NextResponse.json(
        { 
          error: 'FRED API key is not configured',
          events: []
        },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Get today's date and the next 7 days for economic releases
    const today = new Date(date)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 7)
    
    const startDateStr = today.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    console.log('FRED Economic Calendar API - fetching releases from:', startDateStr, 'to', endDateStr)
    
    // Fetch recent releases dates
    // FRED API endpoint: /releases/dates returns all releases with their dates
    const releasesUrl = `${FRED_BASE_URL}/releases/dates?api_key=${FRED_API_KEY}&file_type=json&limit=100&sort_order=desc`
    
    const releasesResponse = await axios.get(releasesUrl, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000
    })
    
    // Filter releases within the date range
    const allReleases = releasesResponse.data?.release_dates || []
    const filteredReleases = allReleases.filter((release: any) => {
      const releaseDate = release.date
      return releaseDate >= startDateStr && releaseDate <= endDateStr
    })
    
    // Get unique release IDs from filtered releases
    const releaseIds = [...new Set(filteredReleases.map((r: any) => r.release_id))]
    
    // Fetch release names for each unique release ID
    const releaseDetails: any[] = []
    for (const releaseId of releaseIds.slice(0, 20)) { // Limit to 20 to avoid too many requests
      try {
        const releaseInfoUrl = `${FRED_BASE_URL}/release?api_key=${FRED_API_KEY}&file_type=json&release_id=${releaseId}`
        const releaseInfoResponse = await axios.get(releaseInfoUrl, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 5000
        })
        if (releaseInfoResponse.data?.releases?.[0]) {
          releaseDetails.push(releaseInfoResponse.data.releases[0])
        }
      } catch (err) {
        console.warn(`Failed to fetch release info for ${releaseId}:`, err)
      }
    }
    
    // Get popular economic series IDs for context
    const popularSeries = [
      { id: 'GDP', name: 'Gross Domestic Product', impact: 3 },
      { id: 'CPIAUCSL', name: 'Consumer Price Index', impact: 3 },
      { id: 'UNRATE', name: 'Unemployment Rate', impact: 3 },
      { id: 'PAYEMS', name: 'Nonfarm Payrolls', impact: 3 },
      { id: 'FEDFUNDS', name: 'Federal Funds Rate', impact: 3 },
      { id: 'INDPRO', name: 'Industrial Production Index', impact: 2 },
      { id: 'RETAILSALES', name: 'Retail Sales', impact: 2 },
      { id: 'HOUST', name: 'Housing Starts', impact: 2 },
      { id: 'DEXUSEU', name: 'U.S. / Euro Foreign Exchange Rate', impact: 2 },
      { id: 'DGS10', name: '10-Year Treasury Rate', impact: 2 },
    ]
    
    // Transform releases into calendar events
    const events: any[] = []
    const processedDates = new Set<string>()
    
    filteredReleases.forEach((release: any, index: number) => {
      const releaseDate = release.date
      const releaseId = release.release_id
      
      // Skip if we've already processed this date
      if (processedDates.has(releaseDate)) return
      
      // Find matching release details
      const releaseDetail = releaseDetails.find((rd: any) => rd.id === releaseId)
      const releaseName = releaseDetail?.name || `Economic Release #${releaseId}`
      
      // Try to find matching series for context
      const matchingSeries = popularSeries.find(s => 
        releaseName.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]) ||
        releaseName.toLowerCase().includes(s.id.toLowerCase())
      )
      
      events.push({
        id: `fred-${releaseId}-${releaseDate}`,
        time: '08:30', // Default time, FRED doesn't provide specific times
        event: releaseName,
        impact: matchingSeries?.impact || 2,
        releaseDate: releaseDate,
        releaseId: releaseId
      })
      
      processedDates.add(releaseDate)
    })
    
    // If no releases found, create some placeholder events based on common economic releases
    if (events.length === 0) {
      const commonEvents = [
        { name: 'Consumer Price Index (CPI)', impact: 3, dayOffset: 0 },
        { name: 'Nonfarm Payrolls (NFP)', impact: 3, dayOffset: 2 },
        { name: 'Federal Reserve Interest Rate Decision', impact: 3, dayOffset: 5 },
        { name: 'Retail Sales', impact: 2, dayOffset: 1 },
        { name: 'Industrial Production', impact: 2, dayOffset: 3 },
      ]
      
      commonEvents.forEach((event, index) => {
        const eventDate = new Date(today)
        eventDate.setDate(eventDate.getDate() + event.dayOffset)
        if (eventDate <= endDate) {
          events.push({
            id: `fred-placeholder-${index}`,
            time: '08:30',
            event: event.name,
            impact: event.impact,
            releaseDate: eventDate.toISOString().split('T')[0],
            releaseId: null
          })
        }
      })
    }
    
    // Sort events by date and time
    events.sort((a: any, b: any) => {
      const dateCompare = a.releaseDate.localeCompare(b.releaseDate)
      if (dateCompare !== 0) return dateCompare
      return a.time.localeCompare(b.time)
    })
    
    console.log('FRED Economic Calendar API - events found:', events.length)
    
    return NextResponse.json({
      events: events,
      count: events.length,
      source: 'FRED',
      dateRange: {
        start: startDateStr,
        end: endDateStr
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error: any) {
    console.error('FRED Economic Calendar API - error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch FRED economic calendar data',
        details: error.message,
        events: [] // Return empty events array on error
      },
      { status: 500 }
    )
  }
}

