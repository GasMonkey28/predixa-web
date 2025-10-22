import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
    const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'
    const S3_TICKER = (process.env.NEXT_PUBLIC_TICKER || 'SPY').toLowerCase()
    
    return NextResponse.json({
      status: 'success',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_S3_BUCKET: process.env.NEXT_PUBLIC_S3_BUCKET,
        NEXT_PUBLIC_TICKER: process.env.NEXT_PUBLIC_TICKER,
        BUCKET: BUCKET,
        TICKER: TICKER,
        S3_TICKER: S3_TICKER
      },
      url: `https://s3.amazonaws.com/${BUCKET}/bars/${S3_TICKER}/15min/latest.json`
    })
  } catch (error: any) {
    console.error('Error in test-env2:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
