import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import { connectionHasTradeScopes } from '@/lib/server/tradestation-config'
import {
  getValidAccessToken,
  placeTradeStationOrder,
  type TradeStationOrderRequest,
} from '@/lib/server/tradestation-client'
import type { OptionDtCandidate } from '@/lib/option-dt'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface PlaceBody {
  accountId?: string
  candidates?: OptionDtCandidate[]
}

export async function POST(request: NextRequest) {
  const clientIp =
    (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(clientIp) }
    )
  }

  const auth = await requireSubscriber(request)
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: getRateLimitHeaders(clientIp) }
    )
  }

  let body: PlaceBody
  try {
    body = (await request.json()) as PlaceBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const candidates = body.candidates ?? []
  if (candidates.length === 0) {
    return NextResponse.json({ error: 'No candidates to place' }, { status: 400 })
  }

  try {
    const { accessToken, connection } = await getValidAccessToken(auth.userId)
    if (!connectionHasTradeScopes(connection.scope)) {
      return NextResponse.json(
        {
          error:
            'TradeStation connection is missing Trade/MarketData scopes. Reconnect from Option DT.',
        },
        { status: 400, headers: getRateLimitHeaders(clientIp) }
      )
    }

    const accountId = body.accountId || connection.selectedAccountId
    if (!accountId) {
      return NextResponse.json({ error: 'Select a paper trading account first' }, { status: 400 })
    }

    const results: Array<{
      id: string
      ticker: string
      optionSymbol: string
      ok: boolean
      orderId?: string
      message?: string
    }> = []

    for (const candidate of candidates) {
      if (!candidate.optionSymbol || candidate.quantity == null || candidate.quantity < 1) {
        results.push({
          id: candidate.id,
          ticker: candidate.ticker,
          optionSymbol: candidate.optionSymbol,
          ok: false,
          message: candidate.quantity === 0 ? 'Skipped (qty 0)' : 'Invalid candidate',
        })
        continue
      }

      const openOrder: TradeStationOrderRequest = {
        AccountID: accountId,
        Symbol: candidate.optionSymbol,
        Quantity: String(Math.max(1, Math.min(99, Math.floor(candidate.quantity)))),
        OrderType: 'Market',
        TradeAction: 'BUYTOOPEN',
        TimeInForce: { Duration: 'DAY' },
        Route: 'Intelligent',
      }

      try {
        const placed = await placeTradeStationOrder(accessToken, openOrder, 'sim')
        const orderId = placed.Orders?.[0]?.OrderID
        const errMsg =
          placed.Errors?.[0]?.Message ||
          placed.Errors?.[0]?.Error ||
          placed.Orders?.[0]?.Error ||
          placed.Orders?.[0]?.Message

        if (!orderId) {
          results.push({
            id: candidate.id,
            ticker: candidate.ticker,
            optionSymbol: candidate.optionSymbol,
            ok: false,
            message: errMsg || 'Order rejected',
          })
          continue
        }

        results.push({
          id: candidate.id,
          ticker: candidate.ticker,
          optionSymbol: candidate.optionSymbol,
          ok: true,
          orderId,
          message: errMsg,
        })
      } catch (error) {
        results.push({
          id: candidate.id,
          ticker: candidate.ticker,
          optionSymbol: candidate.optionSymbol,
          ok: false,
          message: (error as Error).message,
        })
      }
    }

    return NextResponse.json(
      {
        accountId,
        results,
        placed: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        note: 'Default plan is flat by close — use Flatten on this page before the close bell.',
      },
      { headers: getRateLimitHeaders(clientIp) }
    )
  } catch (error) {
    logger.error({ error, userId: auth.userId }, 'Option DT place error')
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to place orders' },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}
