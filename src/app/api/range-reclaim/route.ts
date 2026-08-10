import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'
import { dayMoveFromQuote } from '@/lib/dt-quotes'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import {
  fetchQuoteSnapshots,
  getValidAccessToken,
  type TradeStationQuote,
} from '@/lib/server/tradestation-client'
import {
  EQUITY_TICKERS,
  isSupportedTicker,
  normalizeTicker,
  rangeReclaimLatestKey,
  rangeReclaimWinRatesKey,
  tickerBucket,
} from '@/lib/tickers'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

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

/** Best-effort TradeStation day-move fields on each board row. */
async function enrichBoardRowsWithQuotes(
  rows: Array<Record<string, unknown>>,
  accessToken: string
): Promise<Array<Record<string, unknown>>> {
  const symbols = rows
    .map((r) => (typeof r.ticker === 'string' ? r.ticker.toUpperCase() : ''))
    .filter(Boolean)
  if (symbols.length === 0) return rows

  const quotesBySymbol = new Map<string, TradeStationQuote>()
  const chunkSize = 40
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize)
    try {
      const quotes = await fetchQuoteSnapshots(accessToken, chunk)
      for (const q of quotes) {
        if (q.Symbol) quotesBySymbol.set(q.Symbol.toUpperCase(), q)
      }
    } catch (error) {
      logger.warn(
        { error: (error as Error)?.message, chunk: chunk.slice(0, 3) },
        'range reclaim board: quote chunk failed'
      )
    }
  }

  if (quotesBySymbol.size === 0) return rows

  return rows.map((row) => {
    const ticker = typeof row.ticker === 'string' ? row.ticker.toUpperCase() : ''
    const move = dayMoveFromQuote(quotesBySymbol.get(ticker))
    if (move.last == null && move.netChange == null && move.netChangePct == null) {
      return row
    }
    return {
      ...row,
      last: move.last,
      net_change: move.netChange,
      net_change_pct: move.netChangePct,
    }
  })
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

  const { searchParams } = new URL(request.url)
  const board = searchParams.get('board') === '1'
  const stats = searchParams.get('stats') === '1'
  const ticker = normalizeTicker(searchParams.get('ticker'))

  try {
    if (stats) {
      const { data } = await fetchKey(BUCKET, rangeReclaimWinRatesKey())
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-store',
          ...getRateLimitHeaders(clientIp),
        },
      })
    }

    if (board) {
      const tickers = ['SPY', ...EQUITY_TICKERS]
      const [settled, winRatesSettled] = await Promise.all([
        Promise.allSettled(
          tickers.map(async (t) => {
            const key = rangeReclaimLatestKey(t)
            const { data } = await fetchKey(tickerBucket(t, BUCKET), key)
            return { ticker: t, ...data }
          })
        ),
        fetchKey(BUCKET, rangeReclaimWinRatesKey())
          .then((r) => r.data)
          .catch(() => null),
      ])
      let rows: Array<Record<string, unknown>> = settled.map((r, i) =>
        r.status === 'fulfilled'
          ? r.value
          : {
              ticker: tickers[i],
              status: 'missing',
              signals: [],
              fallback: true,
            }
      )

      try {
        const auth = await requireSubscriber(request)
        if (auth.ok) {
          const { accessToken } = await getValidAccessToken(auth.userId)
          rows = await enrichBoardRowsWithQuotes(rows, accessToken)
        }
      } catch (error) {
        // Board still works without TradeStation; day-change % just stays empty.
        logger.info(
          { message: (error as Error)?.message },
          'range reclaim board: skipping quote enrichment'
        )
      }

      return NextResponse.json(
        {
          board: true,
          generated_at: new Date().toISOString(),
          count: rows.length,
          rows,
          win_rates: winRatesSettled,
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
