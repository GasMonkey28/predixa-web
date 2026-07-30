import { NextResponse } from 'next/server'

import { config } from '@/lib/server/config'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import {
  etDateString,
  fetchLatestSummary,
  fetchPreviousSummary,
} from '@/lib/server/summary-json'
import { isSupportedTicker, normalizeTicker } from '@/lib/tickers'

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BUCKET = config.marketData.bucket

// Clean up text fields to handle encoding issues
const cleanText = (text: string) => {
  if (!text) return text
  return text
    .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

function transformSummary(s3Data: Record<string, unknown>, actualDate: string, prevLong: string | null, prevShort: string | null, prevDate: string | null) {
  return {
    date: actualDate,
    long_tier: (s3Data.long_signal as string) || (s3Data.long_tier as string) || (s3Data.longTier as string) || 'N/A',
    short_tier: (s3Data.short_signal as string) || (s3Data.short_tier as string) || (s3Data.shortTier as string) || 'N/A',
    long_score: (s3Data.long_score as number) || (s3Data.longScore as number) || 0,
    short_score: (s3Data.short_score as number) || (s3Data.shortScore as number) || 0,
    summary: cleanText((s3Data.summary as string) || (s3Data.SUMMARY as string) || 'No summary available'),
    suggestions: Array.isArray(s3Data.suggestions)
      ? (s3Data.suggestions as string[]).map(cleanText)
      : Array.isArray(s3Data.SUGGESTIONS)
      ? (s3Data.SUGGESTIONS as string[]).map(cleanText)
      : [],
    confidence: cleanText((s3Data.confidence as string) || (s3Data.CONFIDENCE as string) || 'Unknown'),
    risk: cleanText((s3Data.risk as string) || (s3Data.RISK as string) || 'Unknown'),
    outlook: cleanText((s3Data.outlook as string) || (s3Data.OUTLOOK as string) || 'No outlook available'),
    disclaimer: cleanText(
      (s3Data.disclaimer as string) ||
        (s3Data.DISCLAIMER as string) ||
        'Data provided for informational purposes only.'
    ),
    compensation_explanation: cleanText(
      (s3Data.compensation_explanation as string) || (s3Data.compensationExplanation as string) || ''
    ),
    opposing_strength_warning: s3Data.opposing_strength_warning ?? null,
    prev_date: prevDate,
    prev_long_tier: prevLong ?? 'N/A',
    prev_short_tier: prevShort ?? 'N/A',
  }
}

export async function GET(request: Request) {
  try {
    const clientIp =
      (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    if (!checkRateLimit(clientIp)) {
      logger.warn({ ip: clientIp }, 'Rate limit exceeded for tiers endpoint')
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(clientIp),
          },
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const ticker = normalizeTicker(searchParams.get('ticker'))
    if (!isSupportedTicker(ticker)) {
      return NextResponse.json(
        { error: `Unsupported ticker: ${ticker}` },
        { status: 400, headers: getRateLimitHeaders(clientIp) }
      )
    }

    const today = etDateString(0)

    try {
      const { date: actualDate, data: s3Data } = await fetchLatestSummary(BUCKET, today, ticker)

      if (actualDate !== today) {
        logger.warn({ today, actualDate, ticker }, 'Using most recent summary_json (today missing)')
      } else {
        logger.debug({ sourceDate: today, ticker }, 'Fetched tiers data for today')
      }

      const prev = await fetchPreviousSummary(BUCKET, actualDate, ticker)
      const prevLong =
        prev
          ? (prev.data.long_signal as string) ||
            (prev.data.long_tier as string) ||
            (prev.data.longTier as string) ||
            'N/A'
          : null
      const prevShort =
        prev
          ? (prev.data.short_signal as string) ||
            (prev.data.short_tier as string) ||
            (prev.data.shortTier as string) ||
            'N/A'
          : null

      const transformedData = {
        ...transformSummary(s3Data, actualDate, prevLong, prevShort, prev?.date ?? null),
        ticker,
      }

      return NextResponse.json(transformedData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'Surrogate-Control': 'no-store',
        },
      })
    } catch (s3Error) {
      const message =
        s3Error instanceof Error ? s3Error.message : typeof s3Error === 'string' ? s3Error : 'Unknown error'
      logger.error({ today, bucket: BUCKET, ticker, error: message }, 'S3 tier summary unavailable; returning fallback')

      const fallback = {
        date: today,
        ticker,
        long_tier: 'N/A',
        short_tier: 'N/A',
        long_score: 0,
        short_score: 0,
        summary: 'Real-time market summary is temporarily unavailable.',
        suggestions: [
          'Verify your network connection and reload the page.',
          'Check back shortly—data refresh runs regularly during market hours.',
        ],
        confidence: 'Unknown',
        risk: 'Unknown',
        outlook: 'Data temporarily unavailable.',
        disclaimer:
          'Live tier data is temporarily unavailable. This fallback preserves access while the data pipeline recovers.',
        compensation_explanation: '',
        opposing_strength_warning: null,
        prev_date: null,
        prev_long_tier: 'N/A',
        prev_short_tier: 'N/A',
        fallback: true,
        error: message,
      }

      return NextResponse.json(fallback, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'Surrogate-Control': 'no-store',
          ...getRateLimitHeaders(clientIp),
        },
      })
    }
  } catch (error) {
    logger.error({ error, message: (error as Error)?.message }, 'Unhandled error in tiers API')
    const clientIp =
      (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    return NextResponse.json({ error: 'Failed to fetch daily tier data' }, {
      status: 500,
      headers: getRateLimitHeaders(clientIp),
    })
  }
}
