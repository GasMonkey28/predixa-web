import { NextResponse } from 'next/server'
import { fetchWeeklyBars } from '@/lib/api'

export async function GET() {
  try {
    const data = await fetchWeeklyBars()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching weekly bars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly data' },
      { status: 500 }
    )
  }
}
