import { NextResponse } from 'next/server'

export async function GET() {
  const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
  const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'
  
  // Test both URL formats
  const oldFormat = `https://${BUCKET}.s3.amazonaws.com/bars/${TICKER.toLowerCase()}/15min/latest.json`
  const newFormat = `https://s3.amazonaws.com/${BUCKET}/bars/${TICKER.toLowerCase()}/15min/latest.json`
  
  return NextResponse.json({
    bucket: BUCKET,
    ticker: TICKER,
    oldFormat,
    newFormat,
    timestamp: new Date().toISOString()
  })
}
