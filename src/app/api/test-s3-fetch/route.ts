import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
  const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'
  
  // Test the actual URL format we're using in the code
  const url = `https://s3.amazonaws.com/${BUCKET}/bars/${TICKER.toLowerCase()}/15min/latest.json`
  
  try {
    console.log(`Testing S3 fetch from: ${url}`)
    const response = await axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    return NextResponse.json({
      success: true,
      url,
      status: response.status,
      dataLength: response.data?.bars?.length || 0,
      firstBar: response.data?.bars?.[0],
      lastBar: response.data?.bars?.[response.data?.bars?.length - 1]
    })
  } catch (error) {
    console.error('S3 fetch error:', error)
    return NextResponse.json({
      success: false,
      url,
      error: error instanceof Error ? error.message : String(error),
      status: error instanceof Error && 'status' in error ? error.status : 'unknown'
    }, { status: 500 })
  }
}
