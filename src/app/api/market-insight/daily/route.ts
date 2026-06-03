import { NextResponse } from 'next/server'

import { config } from '@/lib/server/config'
import { buildMarketInsight } from '@/lib/server/market-insight'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BUCKET = config.marketData.bucket
const TICKER = config.marketData.ticker || 'SPY'

export async function GET(request: Request) {
  try {
    const clientIp =
      (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    if (!checkRateLimit(clientIp)) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(clientIp),
        },
      })
    }

    const { facts, sections, disclaimer } = await buildMarketInsight(BUCKET, TICKER)
    const anySource = Object.values(facts.sources).some(Boolean)

    return NextResponse.json(
      {
        date: facts.date,
        facts,
        sections,
        disclaimer,
        fallback: !anySource,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'Surrogate-Control': 'no-store',
          ...getRateLimitHeaders(clientIp),
        },
      }
    )
  } catch (error) {
    logger.error({ error, message: (error as Error)?.message }, 'Unhandled error in market-insight API')
    const clientIp =
      (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    return NextResponse.json({ error: 'Failed to fetch market insight' }, {
      status: 500,
      headers: getRateLimitHeaders(clientIp),
    })
  }
}
