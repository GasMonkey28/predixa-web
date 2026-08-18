import axios from 'axios'

// FORCE COMPLETE REBUILD - MAJOR CHANGE TO BREAK CACHE
const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET
const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'

if (!BUCKET) {
  console.error('⚠️ NEXT_PUBLIC_S3_BUCKET is not set! Please add it to your .env.local file')
}

// Removed console.log to avoid exposing bucket name in browser console

export type Bar = { t: string; o: number; h: number; l: number; c: number; v?: number }
export type BarsPayload = {
  ticker: string
  interval: string
  market_open?: string
  bars: Bar[]
}

export async function fetchWeeklyBars(
  force = false,
  interval: '15min' | '60min' = '15min',
  ticker: string = TICKER
): Promise<BarsPayload> {
  if (!BUCKET) {
    throw new Error('NEXT_PUBLIC_S3_BUCKET environment variable is not set. Please add it to your .env.local file.')
  }

  // Validate interval parameter
  if (interval !== '15min' && interval !== '60min') {
    throw new Error(`Invalid interval: ${interval}. Must be '15min' or '60min'`)
  }

  // S3 keys are written by the tradier bars Lambda as bars/{symbol-lowercase}/{interval}/latest.json
  // (was hardcoded to 'spy' here previously -- now driven by the ticker param so other
  // symbols, e.g. QQQ, resolve to their own S3 object instead of always reading SPY's).
  const s3Ticker = ticker.toLowerCase()
  const url = `https://s3.amazonaws.com/${BUCKET}/bars/${s3Ticker}/${interval}/latest.json`

  // Removed verbose console.logs to avoid exposing bucket name in browser console
  try {
    const resp = await axios.get(url, {
      headers: {
        ...noCacheHeaders(force)
      }
    })
    console.log('Successfully fetched real data from S3 - PRODUCTION FIX')
    console.log('Raw S3 data structure:', {
      symbol: resp.data.symbol,
      ticker: resp.data.ticker,
      interval: resp.data.interval,
      barsCount: resp.data.bars?.length,
      firstBar: resp.data.bars?.[0],
      lastBar: resp.data.bars?.[resp.data.bars?.length - 1]
    })

    const normalizedData = normalizeBars(resp.data, ticker)
    console.log('Normalized data:', {
      ticker: normalizedData.ticker,
      barsCount: normalizedData.bars.length,
      lastPrice: normalizedData.bars[normalizedData.bars.length - 1]?.c
    })

    return normalizedData
  } catch (error) {
    console.error('S3 bars data not available - THROWING ERROR TO SEE REAL ISSUE')
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error status:', error instanceof Error && 'status' in error ? error.status : 'unknown')
    console.error('Error response:', error instanceof Error && 'response' in error ? error.response : 'unknown')
    console.error('BUCKET:', BUCKET)
    console.error('TICKER:', ticker)
    console.error('URL that failed:', url)
    // Throw the error instead of returning mock data to see the real issue
    throw error
  }
}

export async function fetchDailyBars(force = false, ticker: string = TICKER): Promise<BarsPayload> {
  return await fetchWeeklyBars(force, '15min', ticker)
}

export async function fetchFuture(dateISO: string): Promise<any> {
  // Match iOS app: uses uppercase ticker (SPY.json), bucket.s3.amazonaws.com format
  const ticker = TICKER.toUpperCase() // Match iOS: "SPY"
  const url = `https://${BUCKET}.s3.amazonaws.com/charts/${dateISO}/${ticker}.json`
  console.log('Fetching future data from S3:', url)
  const resp = await axios.get(url, { headers: noCacheHeaders(true) })
  return resp.data
}

export async function fetchEconomicCalendar(): Promise<any> {
  const url = '/api/economic-calendar'
  console.log('Economic Calendar API - attempting to fetch from:', url)
  
  try {
    const resp = await axios.get(url, { 
      headers: noCacheHeaders(true),
      timeout: 15000 // 15 second timeout for our API route
    })
    console.log('Economic Calendar API - response status:', resp.status)
    console.log('Economic Calendar API - response data:', resp.data)
    return resp.data
  } catch (error: any) {
    console.error('Economic Calendar API - error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })
    throw error
  }
}

export async function fetchEconomicCalendarFred(): Promise<any> {
  const url = '/api/economic-calendar-fred'
  console.log('FRED Economic Calendar API - attempting to fetch from:', url)
  
  try {
    const resp = await axios.get(url, { 
      headers: noCacheHeaders(true),
      timeout: 15000 // 15 second timeout for our API route
    })
    console.log('FRED Economic Calendar API - response status:', resp.status)
    console.log('FRED Economic Calendar API - response data:', resp.data)
    return resp.data
  } catch (error: any) {
    console.error('FRED Economic Calendar API - error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })
    throw error
  }
}

export async function fetchEconomicCalendarInvesting(calendarDate?: string): Promise<any> {
  const params = new URLSearchParams()
  if (calendarDate) {
    params.set('date', calendarDate)
  }
  const qs = params.toString()
  const url = qs ? `/api/economic-calendar-investing?${qs}` : '/api/economic-calendar-investing'
  console.log('Investing.com Economic Calendar API - attempting to fetch from:', url)
  
  try {
    const resp = await axios.get(url, { 
      headers: noCacheHeaders(true),
      timeout: 20000 // 20 second timeout for scraping
    })
    console.log('Investing.com Economic Calendar API - response status:', resp.status)
    console.log('Investing.com Economic Calendar API - response data:', resp.data)
    return resp.data
  } catch (error: any) {
    console.error('Investing.com Economic Calendar API - error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })
    throw error
  }
}

function normalizeBars(raw: any, fallbackTicker: string = TICKER): BarsPayload {
  const bars = (raw.bars || []).filter((b: any) => b.o != null && b.h != null && b.l != null && b.c != null)
  return {
    ticker: raw.ticker || raw.symbol || fallbackTicker,
    interval: raw.interval || '15min',
    market_open: raw.market_open,
    bars: bars.map((b: any) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })),
  }
}

function noCacheHeaders(force: boolean) {
  const headers: Record<string, string> = { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
  if (force) headers['x-cache-bust'] = Date.now().toString()
  return headers
}

function generateMockBars(): Bar[] {
  const bars: Bar[] = []
  const basePrice = 500
  const now = new Date()
  
  // Generate 15-minute bars for the current day
  for (let i = 0; i < 26; i++) { // 26 bars for 6.5 hours of trading
    const time = new Date(now)
    time.setHours(9, 30 + (i * 15), 0, 0) // Start at 9:30 AM
    
    const priceChange = (Math.random() - 0.5) * 10 // Random price movement
    const open = basePrice + (i * 0.5) + priceChange
    const high = open + Math.random() * 5
    const low = open - Math.random() * 5
    const close = open + (Math.random() - 0.5) * 3
    
    bars.push({
      t: time.toISOString(),
      o: Math.round(open * 100) / 100,
      h: Math.round(high * 100) / 100,
      l: Math.round(low * 100) / 100,
      c: Math.round(close * 100) / 100,
      v: Math.floor(Math.random() * 1000000) + 500000
    })
  }
  
  return bars
}




