import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'

// Dealer gamma exposure (GEX) regime — Phase 1, display only.
// Reads the small JSON that the standalone `predixa-gex` Lambda writes once a
// weekday. This route consumes nothing else and feeds only <GexRegimeBadge/>.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 15

const BUCKET = config.marketData.bucket
const KEY = 'charts/gex/latest.json'

async function fetchKey(bucket: string, key: string) {
  const urls = [
    `https://s3.amazonaws.com/${bucket}/${key}`,
    `https://${bucket}.s3.amazonaws.com/${key}`,
  ]
  let lastErr: unknown = null
  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        timeout: 8000,
      })
      return res.data
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

function lastTradingDayISO(): string {
  // most recent weekday in America/New_York. Holidays aren't modelled — on a
  // holiday the badge just reads "as of <prev trading day>", which is fine.
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA')
}

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

  try {
    const raw = await fetchKey(BUCKET, KEY)
    const asOf: string | undefined = raw?.as_of_date
    const stale = !asOf || asOf < lastTradingDayISO()

    return NextResponse.json(
      {
        status: 'ok',
        as_of_date: asOf ?? null,
        regime: raw?.regime ?? null, // "positive" | "negative"
        gex_ratio: typeof raw?.gex_ratio === 'number' ? raw.gex_ratio : null,
        gex_raw: typeof raw?.gex_raw === 'number' ? raw.gex_raw : null,
        advisory_size_mult:
          typeof raw?.advisory_size_mult === 'number' ? raw.advisory_size_mult : null,
        suspect: raw?.suspect === true,
        stale,
      },
      { headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn({ error: message }, 'gex latest.json fetch failed')
    // Soft-fail: the badge renders nothing on status !== "ok".
    return NextResponse.json(
      { status: 'missing', error: message },
      { status: 200, headers: { 'Cache-Control': 'no-store', ...getRateLimitHeaders(clientIp) } }
    )
  }
}
