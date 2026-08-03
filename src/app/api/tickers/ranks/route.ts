import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import { buildTickerRanks } from '@/lib/server/ticker-ranks'

export const dynamic = 'force-dynamic'
export const revalidate = 0
/** Parallel S3 reads across all equities can exceed the default serverless budget. */
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const clientIp =
    (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'

  if (!checkRateLimit(clientIp)) {
    logger.warn({ ip: clientIp }, 'Rate limit exceeded for tickers ranks endpoint')
    return new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(clientIp),
      },
    })
  }

  const auth = await requireSubscriber(request)
  if (!auth.ok) {
    logger.warn(
      { ip: clientIp, status: auth.status, error: auth.error },
      'Unauthorized or unsubscribed tickers ranks request'
    )
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: getRateLimitHeaders(clientIp) }
    )
  }

  try {
    const data = await buildTickerRanks()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
        ...getRateLimitHeaders(clientIp),
      },
    })
  } catch (error) {
    logger.error(
      { error, message: (error as Error)?.message, userId: auth.userId },
      'Unhandled error in tickers ranks API'
    )
    return NextResponse.json(
      { error: 'Failed to build ticker ranks' },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}
