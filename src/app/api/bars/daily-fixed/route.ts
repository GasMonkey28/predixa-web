import { NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'

export async function GET() {
  try {
    const bucket = config.marketData.bucket
    const ticker = config.marketData.ticker || 'SPY'
    // CRITICAL FIX: Force lowercase ticker for S3 access - S3 is case sensitive
    const s3Ticker = ticker.toLowerCase()
    
    const url = `https://s3.amazonaws.com/${bucket}/bars/${s3Ticker}/15min/latest.json`
    
    // Removed console.logs to avoid exposing bucket name
    
    const response = await axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    const rawData = response.data
    const bars = (rawData.bars || []).filter((b: any) => b.o != null && b.h != null && b.l != null && b.c != null)
    
    const normalizedData = {
      ticker: rawData.ticker || rawData.symbol || ticker,
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
    console.error('Error in daily-fixed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily data' },
      { status: 500 }
    )
  }
}
