import { NextResponse } from 'next/server'
import axios from 'axios'

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    // Get optional date query parameter (defaults to today)
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Build Railway URL with optional date parameter
    let url = 'https://economic-calendar-python-production.up.railway.app/calendar'
    if (date) {
      url += `?date=${date}`
    }
    
    console.log('Economic Calendar API - fetching from:', url)
    console.log('Economic Calendar API - date parameter:', date)
    
    const response = await axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000 // 15 second timeout
    })
    
    console.log('Economic Calendar API - response status:', response.status)
    console.log('Economic Calendar API - response data:', JSON.stringify(response.data, null, 2))
    console.log('Economic Calendar API - events count:', response.data?.events?.length || response.data?.count || 0)
    
    // Ensure response has events array even if empty
    const responseData = {
      ...response.data,
      events: response.data?.events || [],
      count: response.data?.count || (response.data?.events?.length || 0)
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error: any) {
    console.error('Economic Calendar API - error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch economic calendar data',
        details: error.message,
        events: [] // Return empty events array on error
      },
      { status: 500 }
    )
  }
}



