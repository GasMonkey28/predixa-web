import { NextResponse } from 'next/server'
import { fetchWeeklyBars } from '@/lib/api'

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    // Get interval and ticker from query parameters (defaults: '15min', SPY via fetchWeeklyBars)
    const { searchParams } = new URL(request.url)
    const interval = (searchParams.get('interval') || '15min') as '15min' | '60min'
    const ticker = searchParams.get('ticker') || undefined

    // Validate interval
    if (interval !== '15min' && interval !== '60min') {
      return NextResponse.json(
        { error: `Invalid interval: ${interval}. Must be '15min' or '60min'` },
        { status: 400 }
      )
    }

    const data = ticker ? await fetchWeeklyBars(false, interval, ticker) : await fetchWeeklyBars(false, interval)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching weekly bars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly data' },
      { status: 500 }
    )
  }
}
