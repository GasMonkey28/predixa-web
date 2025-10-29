import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  try {
    const url = 'https://economic-calendar-python-production.up.railway.app/calendar'
    console.log('Economic Calendar API - fetching from:', url)
    
    const response = await axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000 // 10 second timeout
    })
    
    console.log('Economic Calendar API - response status:', response.status)
    console.log('Economic Calendar API - response data:', response.data)
    
    return NextResponse.json(response.data, {
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
