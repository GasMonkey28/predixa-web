import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { isSupportedTicker, moneyflowHorizonKey, normalizeTicker } from '@/lib/tickers'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

const BUCKET = config.marketData.bucket

async function fetchKey(bucket: string, key: string) {
  const urls = [
    `https://s3.amazonaws.com/${bucket}/${key}`,
    `https://${bucket}.s3.amazonaws.com/${key}`,
  ]
  let lastErr: unknown = null
  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        timeout: 10000,
      })
      return response.data
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

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

  const ticker = normalizeTicker(request.nextUrl.searchParams.get('ticker') || 'SPY')
  if (!isSupportedTicker(ticker)) {
    return NextResponse.json(
      { status: 'error', error: `Unsupported ticker: ${ticker}` },
      { status: 400, headers: getRateLimitHeaders(clientIp) }
    )
  }

  try {
    const data = await fetchKey(BUCKET, moneyflowHorizonKey(ticker))
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn({ error: message, ticker }, 'moneyflow-horizon fetch failed')
    return NextResponse.json(
      {
        status: 'missing',
        error: message,
        hint: 'ml-moneyflow-horizon Lambda not deployed yet, or no output written today.',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  }
}
