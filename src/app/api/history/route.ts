import { NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'
import { logger } from '@/lib/server/logger'

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BUCKET = config.marketData.bucket

// Clean up text fields to handle encoding issues
const cleanText = (text: string) => {
  if (!text) return text
  return text
    .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

// Get last 10 trading days (excluding weekends)
function getLast10TradingDays(): string[] {
  const etTimeZone = 'America/New_York'
  const tradingDays: string[] = []
  const today = new Date()
  const etDate = new Date(today.toLocaleString('en-US', { timeZone: etTimeZone }))
  
  let currentDate = new Date(etDate)
  let daysBack = 0
  
  while (tradingDays.length < 10 && daysBack < 20) {
    const dayOfWeek = currentDate.getDay()
    
    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = currentDate.toLocaleDateString('en-CA') // YYYY-MM-DD
      tradingDays.push(dateStr)
    }
    
    // Go back one day
    currentDate.setDate(currentDate.getDate() - 1)
    daysBack++
  }
  
  // Return in chronological order (oldest first)
  return tradingDays.reverse()
}

export async function GET() {
  try {
    // Fetch OHLC data from Yahoo Finance
    let ohlcData: any[] = []
    try {
      const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=10d'
      const yahooResponse = await axios.get(yahooUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      const chartData = yahooResponse.data?.chart?.result?.[0]
      
      if (chartData) {
        const timestamps = chartData.timestamp || []
        const quote = chartData.indicators?.quote?.[0] || {}
        const opens = quote.open || []
        const highs = quote.high || []
        const lows = quote.low || []
        const closes = quote.close || []

        for (let i = 0; i < timestamps.length; i++) {
          const timestamp = timestamps[i]
          const date = new Date(timestamp * 1000)
          
          // Convert to ET timezone to match S3 date format
          const etTimeZone = 'America/New_York'
          const etDate = new Date(date.toLocaleString('en-US', { timeZone: etTimeZone }))
          const dayOfWeek = etDate.getDay()
          
          // Skip weekends
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
        ohlcData = ohlcData.slice(-10)
      }
    } catch (yahooError: any) {
      logger.warn({ error: yahooError.message }, 'Error fetching OHLC data from Yahoo Finance')
    }

    // Fetch tier data from S3
    const tradingDays = getLast10TradingDays()
    const tierDataMap = new Map<string, any>()

    for (const dateStr of tradingDays) {
      try {
        const url = `https://s3.amazonaws.com/${BUCKET}/summary_json/${dateStr}.json`
        
        const response = await axios.get(url, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 5000
        })

        const s3Data = response.data
        
        tierDataMap.set(dateStr, {
          date: dateStr,
          long_tier: s3Data.long_signal || s3Data.long_tier || s3Data.longTier || 'N/A',
          short_tier: s3Data.short_signal || s3Data.short_tier || s3Data.shortTier || 'N/A'
        })
      } catch (error: any) {
        // Skip days where tier data doesn't exist
        if (error.response?.status === 404) {
          logger.debug({ date: dateStr }, 'Tier data not found for date')
        } else {
          logger.warn({ date: dateStr, error: error.message }, 'Error fetching tier data for date')
        }
      }
    }

    // Combine OHLC and tier data by date
    const combinedData = ohlcData.map(ohlc => {
      const tierData = tierDataMap.get(ohlc.date) || {
        date: ohlc.date,
        long_tier: 'N/A',
        short_tier: 'N/A'
      }

      return {
        date: ohlc.date,
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        long_tier: tierData.long_tier,
        short_tier: tierData.short_tier
      }
    })

    return NextResponse.json({
      data: combinedData,
      count: combinedData.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error: any) {
    logger.error({ error, message: error?.message }, 'Unhandled error in history API')
    return NextResponse.json(
      { error: 'Failed to fetch history data' },
      { status: 500 }
    )
  }
}

