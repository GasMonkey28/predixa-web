import { NextResponse } from 'next/server'
import { fetchDailyBars } from '@/lib/api'

export async function GET() {
  try {
    console.log('Testing fetchDailyBars...')
    const data = await fetchDailyBars()
    console.log('fetchDailyBars succeeded:', {
      ticker: data.ticker,
      barsCount: data.bars?.length,
      firstBar: data.bars?.[0],
      lastBar: data.bars?.[data.bars?.length - 1]
    })
    
    return NextResponse.json({
      success: true,
      data: {
        ticker: data.ticker,
        barsCount: data.bars?.length,
        firstBar: data.bars?.[0],
        lastBar: data.bars?.[data.bars?.length - 1]
      }
    })
  } catch (error) {
    console.error('fetchDailyBars failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
