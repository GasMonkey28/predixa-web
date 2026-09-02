import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { fetchOptionChainJson, normalizeOptionChainSymbol } from '@/lib/server/optionchain'

// The complete option surface (~13k rows, every strike of every expiration).
// ~260 KB gzipped — fetched on demand by the Live tab, not polled. The recorder
// writes it gzip-compressed; axios inflates it.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 20

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

  const symbol = normalizeOptionChainSymbol(request.nextUrl.searchParams.get('symbol'))

  try {
    const data = await fetchOptionChainJson('full.json', symbol, 12_000)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn({ error: message, symbol }, 'option-chain/full fetch failed')
    return NextResponse.json(
      { status: 'missing', error: message, hint: 'full.json not written yet, or market closed.' },
      { status: 200, headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  }
}
