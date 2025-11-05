import { NextResponse } from 'next/server'
import axios from 'axios'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    console.log('[TEST] Testing economic calendar API...')
    
    // Get the base URL from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    
    // Call the economic calendar API directly with absolute URL
    const apiUrl = `${baseUrl}/api/economic-calendar-investing`
    console.log('[TEST] Calling API:', apiUrl)
    
    const response = await axios.get(apiUrl, {
      timeout: 30000,
      validateStatus: () => true // Accept all status codes
    })
    
    const data = response.data
    
    console.log('[TEST] Economic calendar API response:', {
      isArray: Array.isArray(data),
      hasEvents: !!(data.events || data.data || data),
      eventsCount: Array.isArray(data) ? data.length : (data.events?.length || data.data?.length || 0),
      isScraped: data.isScraped || false,
      source: data.source || 'unknown',
      sampleEvent: Array.isArray(data) ? data[0] : (data.events?.[0] || data.data?.[0] || null)
    })
    
    // Check if we got real data or fallback
    const events = Array.isArray(data) ? data : (data.events || data.data || [])
    const eventsWithActual = events.filter((e: any) => e.actual).length
    const eventsWithForecast = events.filter((e: any) => e.forecast).length
    
    return NextResponse.json({
      success: true,
      testResults: {
        isScraped: data.isScraped || false,
        source: data.source || 'unknown',
        totalEvents: events.length,
        eventsWithActual,
        eventsWithForecast,
        isFallbackData: !(data.isScraped) || eventsWithActual === 0,
        sampleEvent: events[0] || null,
        firstThreeEvents: events.slice(0, 3).map((e: any) => ({
          event: e.event || e.title,
          actual: e.actual || 'MISSING',
          forecast: e.forecast || 'MISSING',
          previous: e.previous || 'MISSING'
        }))
      },
      rawData: data
    })
  } catch (error) {
    console.error('[TEST] Economic calendar test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      message: 'Check Vercel function logs for detailed error information'
    }, { status: 500 })
  }
}

