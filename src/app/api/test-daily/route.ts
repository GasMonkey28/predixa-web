import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing fetchDailyBars import...')
    
    // Import the function dynamically to catch any import errors
    const { fetchDailyBars } = await import('@/lib/api')
    console.log('fetchDailyBars imported successfully')
    
    console.log('Calling fetchDailyBars...')
    const data = await fetchDailyBars()
    console.log('fetchDailyBars completed successfully:', {
      ticker: data.ticker,
      barsCount: data.bars?.length,
      interval: data.interval
    })
    
    return NextResponse.json({
      success: true,
      data: {
        ticker: data.ticker,
        barsCount: data.bars?.length,
        interval: data.interval,
        firstBar: data.bars?.[0],
        lastBar: data.bars?.[data.bars?.length - 1]
      }
    })
  } catch (error) {
    console.error('fetchDailyBars test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
