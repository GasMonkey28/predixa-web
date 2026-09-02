import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { fetchOptionChainJson, normalizeOptionChainSymbol } from '@/lib/server/optionchain'

// Live 1-minute option-chain snapshot (SPY / QQQ). Reads the compact JSON the
// `optionchain-1min-recorder` Lambda overwrites every minute during market
// hours. Feeds the option-chain widget header + IV term structure.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 15

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
    const data = await fetchOptionChainJson('latest.json', symbol)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn({ error: message, symbol }, 'option-chain fetch failed')
    return NextResponse.json(
      {
        status: 'missing',
        error: message,
        hint: `optionchain-1min-recorder not writing charts/optionchain/${symbol}/latest.json yet, or market is closed.`,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  }
}
