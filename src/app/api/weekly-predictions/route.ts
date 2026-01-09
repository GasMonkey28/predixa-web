import { NextResponse } from 'next/server'
import axios from 'axios'
import { config } from '@/lib/server/config'
import {
  findLastFridayOrMonday,
  findPreviousWeekFriday,
  formatDateYYYYMMDD,
  getPreviousTradingDay,
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
  allWeeks?: WeeklyPrediction[] // For 60min interval - all weeks in visible range
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

/**
 * Get all Friday dates (or Monday if Friday is holiday) for weeks within a date range
 */
function getAllWeekDatesInRange(startDate: Date, endDate: Date): Date[] {
  const weekDates: Date[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Start from the most recent Friday and work backwards
  let currentFriday = findLastFridayOrMonday(end)
  const startDateStr = start.toISOString().split('T')[0]
  
  // Go back until we're before the start date
  let iterations = 0
  while (currentFriday >= start && iterations < 20) {
    const fridayDateStr = currentFriday.toISOString().split('T')[0]
    
    // Only add if this Friday is on or after the start date
    if (fridayDateStr >= startDateStr) {
      weekDates.push(new Date(currentFriday))
    }
    
    // Go back one week
    const previousWeekDate = new Date(currentFriday)
    previousWeekDate.setDate(previousWeekDate.getDate() - 7)
    currentFriday = findLastFridayOrMonday(previousWeekDate)
    
    iterations++
  }
  
  // Reverse to get chronological order (oldest first)
  return weekDates.reverse()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const interval = searchParams.get('interval') || '15min'
    
    // Find dates for current week and previous week
    const currentWeekDate = findLastFridayOrMonday()
    const previousWeekDate = findPreviousWeekFriday()
    
    const currentWeekDateStr = formatDateYYYYMMDD(currentWeekDate)
    const previousWeekDateStr = formatDateYYYYMMDD(previousWeekDate)
    
    // For 60min interval, fetch predictions for all weeks in the visible range
    let allWeeks: WeeklyPrediction[] = []
    if (interval === '60min' && startDateStr && endDateStr) {
      const startDate = new Date(startDateStr)
      const endDate = new Date(endDateStr)
      
      // Get all week dates in the range
      const weekDates = getAllWeekDatesInRange(startDate, endDate)
      
      console.log(`Fetching predictions for ${weekDates.length} weeks in 60min range`)
      
      // Fetch predictions for all weeks in parallel
      const weekPromises = weekDates.map(date => 
        fetchWeeklyPrediction(formatDateYYYYMMDD(date))
      )
      const weekResults = await Promise.all(weekPromises)
      
      // Filter out null results
      allWeeks = weekResults.filter((pred): pred is WeeklyPrediction => pred !== null)
    }
    
    console.log('Fetching weekly predictions:', {
      currentWeek: currentWeekDateStr,
      previousWeek: previousWeekDateStr,
      allWeeksCount: allWeeks.length,
    })
    
    // Fetch both weeks' predictions in parallel (for 15min interval)
    const [currentWeek, previousWeek] = await Promise.all([
      fetchWeeklyPrediction(currentWeekDateStr),
      fetchWeeklyPrediction(previousWeekDateStr),
    ])
    
    const response: WeeklyPredictionsResponse = {
      currentWeek,
      previousWeek,
      ...(interval === '60min' && allWeeks.length > 0 ? { allWeeks } : {}),
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

