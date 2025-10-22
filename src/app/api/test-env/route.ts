import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
    ticker: process.env.NEXT_PUBLIC_TICKER,
    today: new Date().toLocaleDateString('en-CA'),
    yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
  })
}
