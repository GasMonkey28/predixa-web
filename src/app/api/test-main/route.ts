import { NextResponse } from 'next/server'
import axios from 'axios'

const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'
const S3_TICKER = TICKER.toLowerCase()

function normalizeBars(raw: any) {
  const bars = (raw.bars || []).filter((b: any) => b.o != null && b.h != null && b.l != null && b.c != null)
  return {
    ticker: raw.ticker || raw.symbol || TICKER,
    interval: raw.interval || '15min',
    market_open: raw.market_open,
    bars: bars.map((b: any) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })),
  }
}

export async function GET() {
  try {
    const url = `https://s3.amazonaws.com/${BUCKET}/bars/${S3_TICKER}/15min/latest.json`
    
    console.log('Testing main function - fetching from:', url)
    console.log('BUCKET:', BUCKET)
    console.log('TICKER:', TICKER)
    console.log('S3_TICKER:', S3_TICKER)
    
    const response = await axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    console.log('Main function - success:', {
      status: response.status,
      barsCount: response.data?.bars?.length,
      firstBar: response.data?.bars?.[0],
      lastBar: response.data?.bars?.[response.data?.bars?.length - 1]
    })
    
    const normalizedData = normalizeBars(response.data)
    console.log('Main function - normalized:', {
      ticker: normalizedData.ticker,
      barsCount: normalizedData.bars.length,
      firstBar: normalizedData.bars[0],
      lastBar: normalizedData.bars[normalizedData.bars.length - 1]
    })
    
    return NextResponse.json({
      success: true,
      url,
      data: {
        ticker: normalizedData.ticker,
        barsCount: normalizedData.bars.length,
        interval: normalizedData.interval,
        firstBar: normalizedData.bars[0],
        lastBar: normalizedData.bars[normalizedData.bars.length - 1]
      }
    })
  } catch (error) {
    console.error('Main function - error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
