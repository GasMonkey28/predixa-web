import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { isSupportedTicker, normalizeTicker } from '@/lib/tickers'

// 40 trading days of daily OHLC for a ticker, from Yahoo Finance.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 15

type Bar = { date: string; o: number; h: number; l: number; c: number }

export async function GET(request: NextRequest) {
  const clientIp =
    (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'

  if (!checkRateLimit(clientIp)) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...getRateLimitHeaders(clientIp) },
    })
  }

  const ticker = normalizeTicker(request.nextUrl.searchParams.get('ticker'))
  if (!isSupportedTicker(ticker)) {
    return NextResponse.json(
      { status: 'error', error: `Unsupported ticker: ${ticker}` },
      { status: 400, headers: getRateLimitHeaders(clientIp) }
    )
  }

  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=60d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' },
        timeout: 8000,
      }
    )
    const r = res.data?.chart?.result?.[0]
    const ts: number[] = r?.timestamp ?? []
    const q = r?.indicators?.quote?.[0] ?? {}

    const bars: Bar[] = []
    for (let i = 0; i < ts.length; i++) {
      if (q.open?.[i] == null || q.high?.[i] == null || q.low?.[i] == null || q.close?.[i] == null) continue
      const d = new Date(ts[i] * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      const dow = new Date(`${d}T12:00:00`).getDay()
      if (dow === 0 || dow === 6) continue
      bars.push({
        date: d,
        o: +q.open[i].toFixed(2),
        h: +q.high[i].toFixed(2),
        l: +q.low[i].toFixed(2),
        c: +q.close[i].toFixed(2),
      })
    }

    return NextResponse.json(
      { status: 'ok', ticker, bars: bars.slice(-40) },
      { headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn({ error: message, ticker }, 'ohlc-40 fetch failed')
    return NextResponse.json(
      { status: 'missing', ticker, error: message },
      { status: 200, headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  }
}
