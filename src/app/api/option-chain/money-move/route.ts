import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { fetchOptionChainDatedJson, fetchOptionChainJson, normalizeOptionChainSymbol } from '@/lib/server/optionchain'

// Today's money move — cumulative dollar flow (Δvolume × price) for the busiest
// option contracts across a few expiries, through the day. Recomputed every
// 5 min by the optionchain-1min-moneymove Lambda(s).
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
  const date = request.nextUrl.searchParams.get('date')

  try {
    const data = date ? await fetchOptionChainDatedJson(symbol, date) : await fetchOptionChainJson('money_move.json', symbol)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': date ? 'public, max-age=300' : 'no-store', ...getRateLimitHeaders(clientIp) },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn({ error: message, symbol, date }, 'option-chain/money-move fetch failed')
    return NextResponse.json(
      {
        status: 'missing',
        error: message,
        hint: date
          ? `No archived money-move data for ${symbol} on ${date} -- history is only kept for the last few trading days.`
          : 'money_move.json not written yet, or market closed.',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  }
}
