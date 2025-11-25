import { NextResponse } from 'next/server'
import axios from 'axios'

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Fetch last 10 trading days of SPY OHLC from Yahoo Finance
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=10d'
    
    const response = await axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })

    const chartData = response.data?.chart?.result?.[0]
    
    if (!chartData) {
      return NextResponse.json(
        { error: 'Invalid response from Yahoo Finance' },
        { status: 500 }
      )
    }

    const timestamps = chartData.timestamp || []
    const quote = chartData.indicators?.quote?.[0] || {}
    const opens = quote.open || []
    const highs = quote.high || []
    const lows = quote.low || []
    const closes = quote.close || []

    // Combine data and filter out weekends
    const ohlcData = []
        for (let i = 0; i < timestamps.length; i++) {
          const timestamp = timestamps[i]
          const date = new Date(timestamp * 1000)
          
          // Convert to ET timezone to match S3 date format
          const etTimeZone = 'America/New_York'
          const etDate = new Date(date.toLocaleString('en-US', { timeZone: etTimeZone }))
          const dayOfWeek = etDate.getDay()
          
          // Skip weekends (Saturday = 6, Sunday = 0)
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            continue
          }

          // Skip if any OHLC value is null/undefined
          if (opens[i] == null || highs[i] == null || lows[i] == null || closes[i] == null) {
            continue
          }

          const dateStr = etDate.toLocaleDateString('en-CA') // YYYY-MM-DD format
      
      ohlcData.push({
        date: dateStr,
        timestamp: timestamp,
        open: opens[i],
        high: highs[i],
        low: lows[i],
        close: closes[i]
      })
    }

    // Sort by date (oldest first) and take last 10
    ohlcData.sort((a, b) => a.timestamp - b.timestamp)
    const last10Days = ohlcData.slice(-10)

    return NextResponse.json({
      data: last10Days,
      count: last10Days.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error: any) {
    console.error('Error fetching OHLC data from Yahoo Finance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OHLC data', details: error.message },
      { status: 500 }
    )
  }
}

