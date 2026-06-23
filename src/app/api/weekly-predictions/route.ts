import { NextResponse } from 'next/server'
import axios from 'axios'
import { config } from '@/lib/server/config'
import {
  findFridayOfWeekContaining,
  findLastCalendarFriday,
  findLastFridayOrMonday,
  findNextWeekFriday,
  findPreviousWeekCalendarFriday,
  findPreviousWeekFriday,
  formatDateYYYYMMDD,
  fwdJoinOverlapsWeek,
  getMarketAnchorDate,
  getWeekDateRange,
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

/**
 * Fetch weekly prediction from S3
 */
/** S3 keys use calendar Friday; fall back to Monday substitute when needed. */
async function fetchWeeklyPredictionWithFallback(
  primaryDate: Date,
  fallbackDate?: Date
): Promise<WeeklyPrediction | null> {
  const primary = await fetchWeeklyPrediction(formatDateYYYYMMDD(primaryDate))
  if (primary || !fallbackDate) {
    return primary
  }
  const fallbackStr = formatDateYYYYMMDD(fallbackDate)
  if (fallbackStr === formatDateYYYYMMDD(primaryDate)) {
    return null
  }
  return fetchWeeklyPrediction(fallbackStr)
}

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

function isBeforePredictionWeek(pred: WeeklyPrediction, anchor: Date): boolean {
  const predWeek = getWeekDateRange(parseDateYYYYMMDD(pred.fwd_join_date))
  return formatDateYYYYMMDD(anchor) < formatDateYYYYMMDD(predWeek.monday)
}

function classifyWeeklyPredictions(
  latestPublish: WeeklyPrediction | null,
  previousPublish: WeeklyPrediction | null,
  referenceDate: Date = new Date()
): Pick<WeeklyPredictionsResponse, 'currentWeek' | 'previousWeek' | 'nextWeek' | 'publishReady'> {
  const anchor = getMarketAnchorDate(referenceDate)
  const thisWeekFriday = findFridayOfWeekContaining(anchor)
  const nextWeekFriday = findNextWeekFriday(anchor)
  const previousWeekFriday = findPreviousWeekFriday(anchor)

  let currentWeek: WeeklyPrediction | null = null
  let previousWeek: WeeklyPrediction | null = null
  let nextWeek: WeeklyPrediction | null = null

  const assign = (pred: WeeklyPrediction) => {
    if (fwdJoinOverlapsWeek(pred.fwd_join_date, nextWeekFriday)) {
      if (!nextWeek) nextWeek = pred
      return
    }
    if (fwdJoinOverlapsWeek(pred.fwd_join_date, thisWeekFriday)) {
      if (!currentWeek) currentWeek = pred
      return
    }
    if (fwdJoinOverlapsWeek(pred.fwd_join_date, previousWeekFriday)) {
      if (!previousWeek) previousWeek = pred
    }
  }

  // Friday publish targets a week that has not started yet (e.g. holiday Monday)
  if (latestPublish && isBeforePredictionWeek(latestPublish, anchor)) {
    nextWeek = latestPublish
  } else if (latestPublish) {
    assign(latestPublish)
  }

  if (previousPublish) {
    assign(previousPublish)
  }

  if (!nextWeek && latestPublish && fwdJoinOverlapsWeek(latestPublish.fwd_join_date, nextWeekFriday)) {
    nextWeek = latestPublish
  }
  if (nextWeek && !currentWeek && previousPublish && fwdJoinOverlapsWeek(previousPublish.fwd_join_date, thisWeekFriday)) {
    currentWeek = previousPublish
  }
  if (!previousWeek && previousPublish && fwdJoinOverlapsWeek(previousPublish.fwd_join_date, previousWeekFriday)) {
    previousWeek = previousPublish
  }

  if (!currentWeek && latestPublish && !nextWeek) {
    const thisWeekFriday = findFridayOfWeekContaining(anchor)
    if (fwdJoinOverlapsWeek(latestPublish.fwd_join_date, thisWeekFriday)) {
      currentWeek = latestPublish
    }
  }
  if (!previousWeek && previousPublish && previousPublish !== currentWeek && previousPublish !== nextWeek) {
    previousWeek = previousPublish
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
    
    // S3 keys use calendar Friday (e.g. 2026-06-19 on Juneteenth); fall back to Monday substitute.
    const currentWeekDate = findLastCalendarFriday()
    const currentWeekFallback = findLastFridayOrMonday()
    const previousWeekDate = findPreviousWeekCalendarFriday()
    const previousWeekFallback = findPreviousWeekFriday()

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
    
    const [latestPublish, previousPublish] = await Promise.all([
      fetchWeeklyPredictionWithFallback(currentWeekDate, currentWeekFallback),
      fetchWeeklyPredictionWithFallback(previousWeekDate, previousWeekFallback),
    ])

    const classified = classifyWeeklyPredictions(latestPublish, previousPublish)

    console.log('Fetching weekly predictions:', {
      latestPublish: currentWeekDateStr,
      previousPublish: previousWeekDateStr,
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

