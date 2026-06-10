import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

import { formatTradeJournalReason } from '@/lib/trade-journal-reason'
import { config } from '@/lib/server/config'
import { logger } from '@/lib/server/logger'
import { fetchSummaryForDate } from '@/lib/server/summary-json'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BUCKET = config.marketData.bucket

function tierFromSummary(data: Record<string, unknown>, side: 'long' | 'short'): string {
  if (side === 'long') {
    return (
      (data.long_signal as string) ||
      (data.long_tier as string) ||
      (data.longTier as string) ||
      'N/A'
    )
  }
  return (
    (data.short_signal as string) ||
    (data.short_tier as string) ||
    (data.shortTier as string) ||
    'N/A'
  )
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

async function fetchModel2Chart(): Promise<Record<string, unknown> | null> {
  const urls = [
    `https://s3.amazonaws.com/${BUCKET}/model2_y2y3/chart/latest.json`,
    `https://${BUCKET}.s3.amazonaws.com/model2_y2y3/chart/latest.json`,
  ]

  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        timeout: 10000,
      })
      return response.data as Record<string, unknown>
    } catch {
      // try next url
    }
  }

  return null
}

function model2ForDate(
  chart: Record<string, unknown> | null,
  date: string
): {
  position_size: number | null
  pred_y1: number | null
  pred_y2_plus_y3: number | null
} {
  const empty = { position_size: null, pred_y1: null, pred_y2_plus_y3: null }
  if (!chart) return empty

  const today = chart.today as Record<string, unknown> | undefined
  if (today && (today.date as string) === date) {
    return {
      position_size: coerceNumber(today.position_size),
      pred_y1: coerceNumber(today.pred_y1),
      pred_y2_plus_y3: coerceNumber(today.pred_y2_plus_y3),
    }
  }

  const tradingDays = chart.trading_days
  if (!Array.isArray(tradingDays)) return empty

  const match = tradingDays.find(
    (day) => day && typeof day === 'object' && (day as Record<string, unknown>).as_of_date === date
  ) as Record<string, unknown> | undefined

  if (!match) return empty

  return {
    position_size: coerceNumber(match.position_size),
    pred_y1: coerceNumber(match.pred_y1),
    pred_y2_plus_y3: coerceNumber(match.pred_y2_plus_y3),
  }
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')?.trim() ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date. Use YYYY-MM-DD.' }, { status: 400 })
  }

  let longTier = 'N/A'
  let shortTier = 'N/A'

  try {
    const summary = await fetchSummaryForDate(BUCKET, date)
    longTier = tierFromSummary(summary, 'long')
    shortTier = tierFromSummary(summary, 'short')
  } catch (error) {
    logger.warn({ date, error: (error as Error)?.message }, 'Model1 summary missing for journal reason')
  }

  const model2Chart = await fetchModel2Chart()
  const model2 = model2ForDate(model2Chart, date)

  const snapshot = {
    date,
    model1: { long_tier: longTier, short_tier: shortTier },
    model2,
    reason: formatTradeJournalReason({
      model1: { long_tier: longTier, short_tier: shortTier },
      model2,
    }),
  }

  return NextResponse.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
