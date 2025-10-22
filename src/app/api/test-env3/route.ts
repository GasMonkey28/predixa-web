import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'success',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_S3_BUCKET: process.env.NEXT_PUBLIC_S3_BUCKET,
        NEXT_PUBLIC_TICKER: process.env.NEXT_PUBLIC_TICKER,
        BUCKET: process.env.NEXT_PUBLIC_S3_BUCKET!,
        TICKER: process.env.NEXT_PUBLIC_TICKER || 'SPY',
        S3_TICKER: (process.env.NEXT_PUBLIC_TICKER || 'SPY').toLowerCase()
      },
      url: `https://s3.amazonaws.com/${process.env.NEXT_PUBLIC_S3_BUCKET!}/bars/${(process.env.NEXT_PUBLIC_TICKER || 'SPY').toLowerCase()}/15min/latest.json`
    })
  } catch (error: any) {
    console.error('Error in test-env3:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
