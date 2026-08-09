import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import { buildStockDtPlan } from '@/lib/server/stock-dt'
import { connectionHasTradeScopes } from '@/lib/server/tradestation-config'
import { getValidAccessToken } from '@/lib/server/tradestation-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

export async function GET(request: NextRequest) {
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

  const auth = await requireSubscriber(request)
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: getRateLimitHeaders(clientIp) }
    )
  }

  try {
    const { accessToken, connection } = await getValidAccessToken(auth.userId)
    const params = request.nextUrl.searchParams
    const accountId = params.get('accountId') || connection.selectedAccountId
    const sourceRaw = (params.get('source') || 'model_reclaim').trim().toLowerCase()
    const source = sourceRaw === 'ticker_ranks' ? 'ticker_ranks' : 'model_reclaim'
    const budgetRaw = Number(params.get('budget'))
    const minWinRaw = Number(params.get('minWinPct'))

    const plan = await buildStockDtPlan({
      accessToken,
      accountId,
      tradeScopesOk: connectionHasTradeScopes(connection.scope),
      source,
      sideBudget: Number.isFinite(budgetRaw) ? budgetRaw : undefined,
      minWinPct: Number.isFinite(minWinRaw) ? minWinRaw : undefined,
    })

    return NextResponse.json(plan, {
      headers: {
        'Cache-Control': 'no-store',
        ...getRateLimitHeaders(clientIp),
      },
    })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to build Stock DT plan'
    logger.error({ error, message, userId: auth.userId }, 'Stock DT candidates error')
    const status = message.includes('not connected') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status, headers: getRateLimitHeaders(clientIp) }
    )
  }
}
