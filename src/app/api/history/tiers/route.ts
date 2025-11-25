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
    const tradingDays = getLast10TradingDays()
    const tierData = []

    // Fetch tier data for each trading day from S3
    for (const dateStr of tradingDays) {
      try {
        const url = `https://s3.amazonaws.com/${BUCKET}/summary_json/${dateStr}.json`
        
        const response = await axios.get(url, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 5000 // 5 second timeout per request
        })

        const s3Data = response.data
        
        tierData.push({
          date: dateStr,
          long_tier: s3Data.long_signal || s3Data.long_tier || s3Data.longTier || 'N/A',
          short_tier: s3Data.short_signal || s3Data.short_tier || s3Data.shortTier || 'N/A'
        })
      } catch (error: any) {
        // Skip days where tier data doesn't exist
        if (error.response?.status === 404) {
          logger.debug({ date: dateStr }, 'Tier data not found for date')
          continue
        }
        // Log other errors but continue
        logger.warn({ date: dateStr, error: error.message }, 'Error fetching tier data for date')
      }
    }

    return NextResponse.json({
      data: tierData,
      count: tierData.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  } catch (error: any) {
    logger.error({ error, message: error?.message }, 'Unhandled error in history tiers API')
    return NextResponse.json(
      { error: 'Failed to fetch tier data' },
      { status: 500 }
    )
  }
}

