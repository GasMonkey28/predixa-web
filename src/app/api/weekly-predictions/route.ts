import { NextResponse } from 'next/server'
import axios from 'axios'
import { config } from '@/lib/server/config'
import {
  classifyWeeklyPredictionRole,
  findLastFridayOrMonday,
  formatDateYYYYMMDD,
  getMarketAnchorDate,
  getWeeklyPublishCandidateDates,
  isFridayAfterWeeklyPredictionCutoff,
  parseDateYYYYMMDD,
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
  /** Prediction for the upcoming week (published Fridays ~2:50 PM CT) */
  nextWeek: WeeklyPrediction | null
  allWeeks?: WeeklyPrediction[] // For 60min interval - all weeks in visible range
  publishReady?: boolean
}

async function fetchWeeklyPrediction(dateStr: string, ticker: string): Promise<WeeklyPrediction | null> {
  const bucket = config.marketData.bucket
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
    // Missing keys often return 404 or 403 on public S3 buckets
    const status = error.response?.status
    if (status === 404 || status === 403) {
      console.log(`Weekly prediction not found in S3: ${dateStr}/${s3Ticker}.json`)
      return null
    }

    console.error(`Error fetching weekly prediction from S3: ${error.message}`)
    return null
  }
}

/** Load the newest distinct weekly publishes available in S3. */
async function fetchRecentWeeklyPublishes(
  referenceDate: Date = new Date(),
  limit = 2,
  ticker: string = 'SPY'
): Promise<WeeklyPrediction[]> {
  const candidateDates = getWeeklyPublishCandidateDates(referenceDate)
  const results = await Promise.all(candidateDates.map((dateStr) => fetchWeeklyPrediction(dateStr, ticker)))

  const byAsOfDate = new Map<string, WeeklyPrediction>()
  for (const pred of results) {
    if (pred && !byAsOfDate.has(pred.as_of_date)) {
      byAsOfDate.set(pred.as_of_date, pred)
    }
  }

  return [...byAsOfDate.values()]
    .sort((a, b) => b.as_of_date.localeCompare(a.as_of_date))
    .slice(0, limit)
}

/**
 * Get all Friday dates (or Monday if Friday is holiday) for weeks within a date range
 */
function getAllWeekDatesInRange(startDate: Date, endDate: Date): Date[] {
  const weekDates: Date[] = []
  const start = parseDateYYYYMMDD(formatDateYYYYMMDD(startDate))
  const end = parseDateYYYYMMDD(formatDateYYYYMMDD(endDate))
  
  // Start from the most recent Friday and work backwards
  let currentFriday = findLastFridayOrMonday(end)
  const startDateStr = formatDateYYYYMMDD(start)
  
  // Go back until we're before the start date
  let iterations = 0
  while (currentFriday >= start && iterations < 20) {
    const fridayDateStr = formatDateYYYYMMDD(currentFriday)
    
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

function classifyWeeklyPredictions(
  publishes: WeeklyPrediction[],
  referenceDate: Date = new Date()
): Pick<WeeklyPredictionsResponse, 'currentWeek' | 'previousWeek' | 'nextWeek' | 'publishReady'> {
  const anchor = getMarketAnchorDate(referenceDate)
  let currentWeek: WeeklyPrediction | null = null
  let previousWeek: WeeklyPrediction | null = null
  let nextWeek: WeeklyPrediction | null = null

  const sorted = [...publishes].sort((a, b) => b.as_of_date.localeCompare(a.as_of_date))

  for (const pred of sorted) {
    const role = classifyWeeklyPredictionRole(pred.fwd_join_date, anchor)
    if (role === 'next' && !nextWeek) {
      nextWeek = pred
    } else if (role === 'current' && !currentWeek) {
      currentWeek = pred
    } else if (role === 'previous' && !previousWeek) {
      previousWeek = pred
    }
  }

  const publishReady =
    isFridayAfterWeeklyPredictionCutoff(referenceDate) ||
    nextWeek !== null

  return { currentWeek, previousWeek, nextWeek, publishReady }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const interval = searchParams.get('interval') || '15min'
    const ticker = searchParams.get('ticker') || config.marketData.ticker || 'SPY'

    const referenceDate = new Date()
    const candidateDates = getWeeklyPublishCandidateDates(referenceDate)

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
        fetchWeeklyPrediction(formatDateYYYYMMDD(date), ticker)
      )
      const weekResults = await Promise.all(weekPromises)

      // Filter out null results
      allWeeks = weekResults.filter((pred): pred is WeeklyPrediction => pred !== null)
    }

    const publishes = await fetchRecentWeeklyPublishes(referenceDate, 2, ticker)
    const classified = classifyWeeklyPredictions(publishes, referenceDate)

    console.log('Fetching weekly predictions:', {
      candidateDates,
      publishAsOfDates: publishes.map((p) => p.as_of_date),
      currentWeekAsOf: classified.currentWeek?.as_of_date ?? null,
      currentWeekFwdJoin: classified.currentWeek?.fwd_join_date ?? null,
      allWeeksCount: allWeeks.length,
      nextWeekFwdJoin: classified.nextWeek?.fwd_join_date ?? null,
      publishReady: classified.publishReady,
    })

    const response: WeeklyPredictionsResponse = {
      ...classified,
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
        nextWeek: null,
        error: 'Failed to fetch weekly predictions',
      },
      { status: 500 }
    )
  }
}

