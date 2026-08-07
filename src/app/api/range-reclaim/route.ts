import { NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import {
  EQUITY_TICKERS,
  isSupportedTicker,
  normalizeTicker,
  rangeReclaimLatestKey,
  tickerBucket,
} from '@/lib/tickers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
      return { data: response.data, url }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const board = searchParams.get('board') === '1'
  const ticker = normalizeTicker(searchParams.get('ticker'))

  try {
    if (board) {
      const tickers = ['SPY', ...EQUITY_TICKERS]
      const settled = await Promise.allSettled(
        tickers.map(async (t) => {
          const key = rangeReclaimLatestKey(t)
          const { data } = await fetchKey(tickerBucket(t, BUCKET), key)
          return { ticker: t, ...data }
        })
      )
      const rows = settled.map((r, i) =>
        r.status === 'fulfilled'
          ? r.value
          : {
              ticker: tickers[i],
              status: 'missing',
              signals: [],
              fallback: true,
            }
      )

      return NextResponse.json(
        {
          board: true,
          generated_at: new Date().toISOString(),
          count: rows.length,
          rows,
        },
        {
          headers: {
            'Cache-Control': 'no-store',
            ...getRateLimitHeaders(clientIp),
          },
        }
      )
    }

    if (!isSupportedTicker(ticker)) {
      return NextResponse.json(
        { error: `Unsupported ticker: ${ticker}` },
        { status: 400, headers: getRateLimitHeaders(clientIp) }
      )
    }

    const key = rangeReclaimLatestKey(ticker)
    const { data } = await fetchKey(tickerBucket(ticker, BUCKET), key)
    return NextResponse.json(
      { ...data, ticker },
      {
        headers: {
          'Cache-Control': 'no-store',
          ...getRateLimitHeaders(clientIp),
        },
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn({ ticker, board, error: message }, 'range reclaim fetch failed')
    return NextResponse.json(
      {
        ticker,
        status: 'missing',
        signals: [],
        fallback: true,
        error: message,
        hint: 'Lambda predixa-range-reclaim not deployed yet, or feeder JSON not written.',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          ...getRateLimitHeaders(clientIp),
        },
      }
    )
  }
}
