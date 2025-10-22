import { NextResponse } from 'next/server'

export async function GET() {
  const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
  const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'
  const S3_TICKER = (process.env.NEXT_PUBLIC_TICKER || 'SPY').toLowerCase()
  
  return NextResponse.json({
    status: 'success',
    NODE_ENV: process.env.NODE_ENV,
    BUCKET: BUCKET,
    TICKER: TICKER,
    S3_TICKER: S3_TICKER,
    TICKER_LENGTH: TICKER.length,
    S3_TICKER_LENGTH: S3_TICKER.length,
    TICKER_CHAR_CODES: TICKER.split('').map(c => c.charCodeAt(0)),
    S3_TICKER_CHAR_CODES: S3_TICKER.split('').map(c => c.charCodeAt(0)),
    timestamp: new Date().toISOString()
  })
}
