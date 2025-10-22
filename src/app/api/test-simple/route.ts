import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  try {
    const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
    const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'
    const url = `https://s3.amazonaws.com/${BUCKET}/bars/${TICKER.toLowerCase()}/15min/latest.json`
    
    console.log('Simple S3 test - fetching from:', url)
    const response = await axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    console.log('Simple S3 test - success:', {
      status: response.status,
      barsCount: response.data?.bars?.length,
      firstBar: response.data?.bars?.[0],
      lastBar: response.data?.bars?.[response.data?.bars?.length - 1]
    })
    
    return NextResponse.json({
      success: true,
      url,
      status: response.status,
      barsCount: response.data?.bars?.length,
      firstBar: response.data?.bars?.[0],
      lastBar: response.data?.bars?.[response.data?.bars?.length - 1]
    })
  } catch (error) {
    console.error('Simple S3 test - error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
