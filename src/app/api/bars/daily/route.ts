import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  try {
    const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
    const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'
    const S3_TICKER = (process.env.NEXT_PUBLIC_TICKER || 'SPY').toLowerCase()
    
    const url = `https://s3.amazonaws.com/${BUCKET}/bars/${S3_TICKER}/15min/latest.json`
    
    console.log('DAILY API - fetching from:', url)
    console.log('BUCKET:', BUCKET)
    console.log('TICKER:', TICKER)
    console.log('S3_TICKER:', S3_TICKER)
    
    const response = await axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    const rawData = response.data
    const bars = (rawData.bars || []).filter((b: any) => b.o != null && b.h != null && b.l != null && b.c != null)
    
    const normalizedData = {
      ticker: rawData.ticker || rawData.symbol || TICKER,
      interval: rawData.interval || '15min',
      market_open: rawData.market_open,
      bars: bars.map((b: any) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })),
    }
    
    return NextResponse.json(normalizedData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error: any) {
    console.error('Error fetching daily bars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily data' },
      { status: 500 }
    )
  }
}
