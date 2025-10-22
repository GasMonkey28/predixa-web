import { NextResponse } from 'next/server'
import axios from 'axios'

const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'

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
    const url = `https://s3.amazonaws.com/${BUCKET}/bars/${TICKER.toLowerCase()}/15min/latest.json`
    
    console.log('Testing normalizeBars - fetching from:', url)
    const response = await axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    console.log('Raw data received:', {
      symbol: response.data.symbol,
      ticker: response.data.ticker,
      interval: response.data.interval,
      barsCount: response.data.bars?.length
    })
    
    const normalizedData = normalizeBars(response.data)
    console.log('Normalized data:', {
      ticker: normalizedData.ticker,
      interval: normalizedData.interval,
      barsCount: normalizedData.bars.length,
      firstBar: normalizedData.bars[0],
      lastBar: normalizedData.bars[normalizedData.bars.length - 1]
    })
    
    return NextResponse.json({
      success: true,
      url,
      rawData: {
        symbol: response.data.symbol,
        ticker: response.data.ticker,
        interval: response.data.interval,
        barsCount: response.data.bars?.length
      },
      normalizedData: {
        ticker: normalizedData.ticker,
        interval: normalizedData.interval,
        barsCount: normalizedData.bars.length,
        firstBar: normalizedData.bars[0],
        lastBar: normalizedData.bars[normalizedData.bars.length - 1]
      }
    })
  } catch (error) {
    console.error('Normalize test - error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
