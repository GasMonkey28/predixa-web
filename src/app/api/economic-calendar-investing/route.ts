import { NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper function to add CORS headers
function addCorsHeaders(headers: HeadersInit = {}) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma',
    'Access-Control-Max-Age': '86400'
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: addCorsHeaders()
  })
}

interface CalendarEvent {
  id: string
  time: string
  event: string
  impact: number
  country: string
  currency: string
  actual: string | null
  forecast: string | null
  previous: string | null
}

// Investing.com now serves the calendar as a Next.js app. The event data is
// embedded in a <script id="__NEXT_DATA__"> JSON blob rather than an HTML table.
// Shape: props.pageProps.state.economicCalendarStore.calendarEventsByDate[date] = Event[]
function parseNextData(html: string, requestedDate: string): CalendarEvent[] {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match || !match[1]) {
    return []
  }

  let json: any
  try {
    json = JSON.parse(match[1])
  } catch {
    return []
  }

  const byDate = json?.props?.pageProps?.state?.economicCalendarStore?.calendarEventsByDate
  if (!byDate || typeof byDate !== 'object') {
    return []
  }

  // Prefer the requested date; otherwise flatten everything the page returned.
  const rawEvents: any[] = Array.isArray(byDate[requestedDate])
    ? byDate[requestedDate]
    : Object.values(byDate).flat() as any[]

  const normalizeValue = (val: any): string | null => {
    if (val === null || val === undefined) return null
    const str = String(val).trim()
    if (str === '' || str === '-' || str === 'TBD' || str === 'N/A') return null
    return str
  }

  // Investing.com timestamps are ISO/UTC; the UI expects Eastern Time "HH:MM".
  const toEasternTime = (iso: string): string | null => {
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return null
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(d)
    } catch {
      return null
    }
  }

  const events: CalendarEvent[] = []

  rawEvents.forEach((e: any, index: number) => {
    if (!e || typeof e !== 'object') return
    // Skip holidays - they are not economic data releases.
    if (e.type === 'holiday') return

    const eventName = e.event || e.eventLong || 'Economic Event'
    if (!eventName || eventName === 'Economic Event') return

    events.push({
      id: `investing-${e.eventId ?? index}`,
      time: toEasternTime(e.time) || '08:30',
      event: eventName,
      impact: parseInt(e.importance, 10) || 1,
      country: e.country || (e.currency === 'USD' ? 'United States' : ''),
      currency: e.currency || '',
      actual: normalizeValue(e.actual),
      forecast: normalizeValue(e.forecast),
      previous: normalizeValue(e.previous)
    })
  })

  return events
}

const INVESTING_URL = 'https://www.investing.com/economic-calendar'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  Referer: 'https://www.investing.com/',
}

type FetchAttempt = { method: string; url: string; useProxyHeaders: boolean }

function buildFetchAttempts(customProxyUrl: string | null, scraperApiKey: string | null): FetchAttempt[] {
  const attempts: FetchAttempt[] = []

  // Direct first — works on Vercel when Investing.com does not block the IP.
  attempts.push({ method: 'direct', url: INVESTING_URL, useProxyHeaders: false })

  if (scraperApiKey) {
    attempts.push({
      method: 'scraperapi',
      url: `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(INVESTING_URL)}`,
      useProxyHeaders: true,
    })
  }

  // Custom proxy last — avoids a stale CUSTOM_PROXY_URL (offline Railway) breaking the calendar.
  if (customProxyUrl) {
    const proxyBase =
      customProxyUrl.startsWith('http://') || customProxyUrl.startsWith('https://')
        ? customProxyUrl
        : `https://${customProxyUrl}`
    attempts.push({
      method: 'custom_proxy',
      url: `${proxyBase}?url=${encodeURIComponent(INVESTING_URL)}`,
      useProxyHeaders: true,
    })
  }

  return attempts
}

function isUsableCalendarHtml(data: unknown): data is string {
  return (
    typeof data === 'string' &&
    data.length > 10_000 &&
    data.includes('__NEXT_DATA__') &&
    data.includes('calendarEventsByDate')
  )
}

async function fetchInvestingHtml(
  customProxyUrl: string | null,
  scraperApiKey: string | null
): Promise<{ html: string; method: string }> {
  const attempts = buildFetchAttempts(customProxyUrl, scraperApiKey)
  const errors: string[] = []

  for (const attempt of attempts) {
    try {
      console.log('[ECONOMIC CALENDAR] Trying fetch method:', attempt.method, attempt.url.slice(0, 120))
      const response = await axios.get(attempt.url, {
        headers: attempt.useProxyHeaders ? {} : BROWSER_HEADERS,
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      })

      console.log('[ECONOMIC CALENDAR] Response:', {
        method: attempt.method,
        status: response.status,
        length: typeof response.data === 'string' ? response.data.length : 0,
      })

      if (response.status === 403 || response.status === 429) {
        errors.push(`${attempt.method}: HTTP ${response.status}`)
        continue
      }
      if (response.status >= 400) {
        errors.push(`${attempt.method}: HTTP ${response.status}`)
        continue
      }
      if (!isUsableCalendarHtml(response.data)) {
        errors.push(`${attempt.method}: missing __NEXT_DATA__ / calendarEventsByDate`)
        continue
      }

      return { html: response.data, method: attempt.method }
    } catch (err: any) {
      errors.push(`${attempt.method}: ${err.message}`)
    }
  }

  throw new Error(
    `Could not fetch Investing.com calendar (${errors.join('; ') || 'no methods configured'})`
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  console.log('Investing.com Economic Calendar API - fetching for date:', date)

  const scraperApiKey = config.proxies.scraperApiKey
  const customProxyUrl = config.proxies.customProxyUrl
  let fetchMethod = 'unknown'

  try {
    const { html, method } = await fetchInvestingHtml(customProxyUrl, scraperApiKey)
    fetchMethod = method

    // Parse the embedded __NEXT_DATA__ JSON (the new site structure).
    const allEvents = parseNextData(html, date)
    console.log('[ECONOMIC CALENDAR] Parsed events from __NEXT_DATA__:', allEvents.length)

    if (allEvents.length === 0) {
      // Either we were blocked or the page structure changed again.
      console.error(
        '[ECONOMIC CALENDAR] No events parsed from __NEXT_DATA__. The page may be blocked or its structure changed.',
        { responseSize: html.length, hasNextData: html.includes('__NEXT_DATA__'), fetchMethod }
      )
      return NextResponse.json(
        {
          events: [],
          count: 0,
          source: 'investing.com',
          date,
          isScraped: false,
          fetchMethod,
          note: 'Could not parse economic calendar data from Investing.com (blocked or structure changed).'
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store',
            ...addCorsHeaders()
          }
        }
      )
    }

    // Filter to USA events.
    const usaEvents = allEvents.filter((event) => {
      if (event.currency.toUpperCase() === 'USD') return true
      const country = (event.country || '').toUpperCase()
      return (
        country === 'US' ||
        country === 'USA' ||
        country.includes('UNITED STATES') ||
        country.startsWith('US')
      )
    })

    const eventsWithActual = usaEvents.filter((e) => e.actual).length
    const eventsWithForecast = usaEvents.filter((e) => e.forecast).length
    const eventsWithPrevious = usaEvents.filter((e) => e.previous).length

    console.log('[ECONOMIC CALENDAR] Summary:', {
      totalEvents: allEvents.length,
      usaEvents: usaEvents.length,
      withActual: eventsWithActual,
      withForecast: eventsWithForecast,
      withPrevious: eventsWithPrevious,
      sampleEvent: usaEvents[0]
        ? {
            event: usaEvents[0].event,
            actual: usaEvents[0].actual || 'MISSING',
            forecast: usaEvents[0].forecast || 'MISSING',
            previous: usaEvents[0].previous || 'MISSING'
          }
        : null
    })

    return NextResponse.json(
      {
        events: usaEvents.slice(0, 20),
        count: usaEvents.length,
        source: 'investing.com',
        date,
        isScraped: true,
        fetchMethod,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          ...addCorsHeaders()
        }
      }
    )
  } catch (error: any) {
    console.error('[ECONOMIC CALENDAR] Error fetching from investing.com:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      hasCustomProxy: !!customProxyUrl,
      hasScraperApi: !!scraperApiKey,
    })

    return NextResponse.json(
      {
        events: [],
        count: 0,
        source: 'investing.com',
        date,
        isScraped: false,
        error: 'Failed to fetch Investing.com economic calendar data',
        details: error.message,
        hint: customProxyUrl
          ? 'Remove stale CUSTOM_PROXY_URL from Vercel if Railway proxy is offline, or add SCRAPER_API_KEY.'
          : 'Add SCRAPER_API_KEY in Vercel if Investing.com blocks direct requests.',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          ...addCorsHeaders()
        }
      }
    )
  }
}
