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
  const url = `https://${BUCKET}.s3.amazonaws.com/bars/${TICKER.toLowerCase()}/15min/latest.json`
  const resp = await axios.get(url, { headers: noCacheHeaders(force) })
  return normalizeBars(resp.data)
}

export async function fetchDailyBars(force = false): Promise<BarsPayload> {
  return fetchWeeklyBars(force)
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




