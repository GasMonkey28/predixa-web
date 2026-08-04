import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import { buildOptionDtPlan } from '@/lib/server/option-dt'
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
    const accountId =
      request.nextUrl.searchParams.get('accountId') || connection.selectedAccountId

    const plan = await buildOptionDtPlan({
      accessToken,
      accountId,
      tradeScopesOk: connectionHasTradeScopes(connection.scope),
    })

    return NextResponse.json(plan, {
      headers: {
        'Cache-Control': 'no-store',
        ...getRateLimitHeaders(clientIp),
      },
    })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to build Option DT plan'
    logger.error({ error, message, userId: auth.userId }, 'Option DT candidates error')
    const status = message.includes('not connected') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status, headers: getRateLimitHeaders(clientIp) }
    )
  }
}
