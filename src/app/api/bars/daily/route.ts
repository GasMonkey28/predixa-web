import { NextResponse } from 'next/server'
import { fetchDailyBars } from '@/lib/api'

export async function GET() {
  try {
    const data = await fetchDailyBars()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error fetching daily bars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily data' },
      { status: 500 }
    )
  }
}
