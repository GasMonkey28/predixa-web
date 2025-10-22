import axios from 'axios'

const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'

export type Bar = { t: string; o: number; h: number; l: number; c: number; v?: number }
export type BarsPayload = {
  ticker: string
  interval: string
  market_open?: string
  bars: Bar[]
}

export async function fetchWeeklyBars(force = false): Promise<BarsPayload> {
  try {
    const url = `https://${BUCKET}.s3.amazonaws.com/bars/${TICKER.toLowerCase()}/15min/latest.json`
    console.log(`Fetching bars from: ${url}`)
    const resp = await axios.get(url, { headers: noCacheHeaders(force) })
    return normalizeBars(resp.data)
  } catch (error) {
    console.log('S3 bars data not available, using mock data for weekly bars')
    // Return mock data when S3 is not available
    return {
      ticker: TICKER,
      interval: '15min',
      market_open: '09:30',
      bars: generateMockBars()
    }
  }
}

export async function fetchDailyBars(force = false): Promise<BarsPayload> {
  return await fetchWeeklyBars(force)
}

export async function fetchFuture(dateISO: string): Promise<any> {
  const url = `https://${BUCKET}.s3.amazonaws.com/charts/${dateISO}/${TICKER}.json`
  const resp = await axios.get(url, { headers: noCacheHeaders(true) })
  return resp.data
}

export async function fetchEconomicCalendar(): Promise<any> {
  const url = 'https://economic-calendar-python-production.up.railway.app/calendar'
  const resp = await axios.get(url, { headers: noCacheHeaders(true) })
  return resp.data
}

function normalizeBars(raw: any): BarsPayload {
  const bars = (raw.bars || []).filter((b: any) => b.o != null && b.h != null && b.l != null && b.c != null)
  return {
    ticker: raw.ticker || TICKER,
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




