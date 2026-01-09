import { NextResponse } from 'next/server'
import axios from 'axios'
import { config } from '@/lib/server/config'
import {
  findLastFridayOrMonday,
  findPreviousWeekFriday,
  formatDateYYYYMMDD,
} from '@/lib/trading-calendar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface WeeklyPrediction {
  ticker: string
  as_of_date: string
  fwd_join_date: string
  baseline_week_close: number
  t_close_to_pre: number
  t_lowest_to_close: number
  t_highest_to_pre: number
}

interface WeeklyPredictionsResponse {
  currentWeek: WeeklyPrediction | null
  previousWeek: WeeklyPrediction | null
}

/**
 * Fetch weekly prediction from S3
 */
async function fetchWeeklyPrediction(dateStr: string): Promise<WeeklyPrediction | null> {
  const bucket = config.marketData.bucket
  const ticker = config.marketData.ticker || 'SPY'
  const s3Ticker = ticker.toUpperCase() // S3 uses uppercase ticker
  
  const url = `https://s3.amazonaws.com/${bucket}/weekly/${dateStr}/${s3Ticker}.json`
  
  try {
    const response = await axios.get<WeeklyPrediction>(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      timeout: 10000, // 10 second timeout
    })
    
    if (response.data) {
      return response.data
    }
    
    return null
  } catch (error: any) {
    // 404 is expected if prediction file doesn't exist yet
    if (error.response?.status === 404) {
      console.log(`Weekly prediction not found in S3: ${dateStr}/${s3Ticker}.json`)
      return null
    }
    
    console.error(`Error fetching weekly prediction from S3: ${error.message}`)
    return null
  }
}

export async function GET() {
  try {
    // Find dates for current week and previous week
    const currentWeekDate = findLastFridayOrMonday()
    const previousWeekDate = findPreviousWeekFriday()
    
    const currentWeekDateStr = formatDateYYYYMMDD(currentWeekDate)
    const previousWeekDateStr = formatDateYYYYMMDD(previousWeekDate)
    
    console.log('Fetching weekly predictions:', {
      currentWeek: currentWeekDateStr,
      previousWeek: previousWeekDateStr,
    })
    
    // Fetch both weeks' predictions in parallel
    const [currentWeek, previousWeek] = await Promise.all([
      fetchWeeklyPrediction(currentWeekDateStr),
      fetchWeeklyPrediction(previousWeekDateStr),
    ])
    
    const response: WeeklyPredictionsResponse = {
      currentWeek,
      previousWeek,
    }
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('Error in weekly-predictions API:', error)
    return NextResponse.json(
      {
        currentWeek: null,
        previousWeek: null,
        error: 'Failed to fetch weekly predictions',
      },
      { status: 500 }
    )
  }
}

