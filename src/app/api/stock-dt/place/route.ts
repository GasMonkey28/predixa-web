import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import { requireSubscriber } from '@/lib/server/require-subscriber'
import { connectionHasTradeScopes } from '@/lib/server/tradestation-config'
import {
  fetchTradeStationCurrentOrders,
  getValidAccessToken,
  placeTradeStationOrder,
  type TradeStationOrderRequest,
} from '@/lib/server/tradestation-client'
import type { StockDtCandidate } from '@/lib/stock-dt'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface PlaceBody {
  accountId?: string
  candidates?: StockDtCandidate[]
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
            'TradeStation connection is missing Trade/MarketData scopes. Reconnect from Stock DT.',
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
      ok: boolean
      orderId?: string
      status?: string
      message?: string
    }> = []

    for (const candidate of candidates) {
      if (!candidate.ticker || candidate.quantity == null || candidate.quantity < 1) {
        results.push({
          id: candidate.id,
          ticker: candidate.ticker,
          ok: false,
          message: candidate.quantity === 0 ? 'Skipped (qty 0)' : 'Invalid candidate',
        })
        continue
      }

      const tradeAction: TradeStationOrderRequest['TradeAction'] =
        candidate.side === 'long' ? 'BUY' : 'SELLSHORT'

      const openOrder: TradeStationOrderRequest = {
        AccountID: accountId,
        Symbol: candidate.ticker,
        Quantity: String(Math.max(1, Math.min(10_000, Math.floor(candidate.quantity)))),
        OrderType: 'Market',
        TradeAction: tradeAction,
        TimeInForce: { Duration: 'DAY' },
        Route: 'Intelligent',
        BuyingPowerWarning: 'Confirmed',
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
            ok: false,
            message: errMsg || 'Order rejected',
          })
          continue
        }

        results.push({
          id: candidate.id,
          ticker: candidate.ticker,
          ok: true,
          orderId,
          message: errMsg,
        })
      } catch (error) {
        results.push({
          id: candidate.id,
          ticker: candidate.ticker,
          ok: false,
          message: (error as Error).message,
        })
      }
    }

    const acceptedIds = results.map((r) => r.orderId).filter(Boolean) as string[]
    if (acceptedIds.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 700))
      try {
        const live = await fetchTradeStationCurrentOrders(accessToken, [accountId], 'sim')
        const byId = new Map(live.map((o) => [o.OrderID, o]))
        for (const row of results) {
          if (!row.orderId) continue
          const order = byId.get(row.orderId)
          if (!order) continue
          const status = (order.Status || '').toUpperCase()
          row.status = order.Status
          const detail =
            order.RejectReason ||
            (order.StatusDescription &&
            order.StatusDescription.toLowerCase() !== 'rejected'
              ? order.StatusDescription
              : null) ||
            order.Status ||
            row.message
          if (status === 'REJ' || status === 'CAN' || status === 'EXP' || status === 'OUT') {
            row.ok = false
            row.message = detail || 'Order not filled'
          } else if (status === 'FLL' || status === 'FPR') {
            row.message = status === 'FLL' ? 'Filled' : 'Partial fill'
          } else {
            row.message = `Working (${order.Status || 'ACK'}) — not a position until filled`
          }
        }
      } catch {
        // Status lookup is best-effort; accept result still stands.
      }
    }

    const working = results.filter(
      (r) => r.ok && r.message?.toLowerCase().includes('working')
    ).length

    return NextResponse.json(
      {
        accountId,
        results,
        placed: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        note:
          working > 0
            ? `${working} accepted but not filled yet — Open stock positions only lists fills. Check Working orders below.`
            : 'Default plan is flat by close — use Flatten on this page before the close bell.',
      },
      { headers: getRateLimitHeaders(clientIp) }
    )
  } catch (error) {
    logger.error({ error, userId: auth.userId }, 'Stock DT place error')
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to place orders' },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}
