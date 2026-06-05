import { NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

import { config } from '@/lib/server/config'
import {
  ECONOMIC_CALENDAR_TIMEZONE,
  getDateStringInTimeZone,
  getEconomicCalendarDate,
} from '@/lib/trading-calendar'

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
type ParseResult = {
  events: CalendarEvent[]
  embeddedDate: string | null
  isAheadOfRequested: boolean
}

function parseNextData(html: string, requestedDate: string): ParseResult {
  const empty: ParseResult = { events: [], embeddedDate: null, isAheadOfRequested: false }
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match || !match[1]) {
    return empty
  }

  let json: any
  try {
    json = JSON.parse(match[1])
  } catch {
    return empty
  }

  const byDate = json?.props?.pageProps?.state?.economicCalendarStore?.calendarEventsByDate
  if (!byDate || typeof byDate !== 'object') {
    return empty
  }

  const { events: rawEvents, embeddedDate, isAheadOfRequested } = resolveRawEvents(
    byDate,
    requestedDate
  )
  if (rawEvents.length === 0) {
    return empty
  }

  const normalizeValue = (val: any): string | null => {
    if (val === null || val === undefined) return null
    const str = String(val).trim()
    if (str === '' || str === '-' || str === 'TBD' || str === 'N/A') return null
    return str
  }

  // Investing.com timestamps are ISO/UTC; show release time in Central Time.
  const toCentralTime = (iso: string): string | null => {
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return null
      return new Intl.DateTimeFormat('en-US', {
        timeZone: ECONOMIC_CALENDAR_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
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
      time: toCentralTime(e.time) || '08:30',
      event: eventName,
      impact: parseInt(e.importance, 10) || 1,
      country: e.country || (e.currency === 'USD' ? 'United States' : ''),
      currency: e.currency || '',
      actual: normalizeValue(e.actual),
      forecast: normalizeValue(e.forecast),
      previous: normalizeValue(e.previous)
    })
  })

  return { events, embeddedDate, isAheadOfRequested }
}

/** Pick the Investing.com day bucket closest to the requested Central calendar date. */
function resolveRawEvents(
  byDate: Record<string, any[]>,
  requestedDate: string
): { events: any[]; embeddedDate: string | null; isAheadOfRequested: boolean } {
  const keys = Object.keys(byDate).sort()
  if (keys.length === 0) {
    return { events: [], embeddedDate: null, isAheadOfRequested: false }
  }

  if (Array.isArray(byDate[requestedDate])) {
    return {
      events: byDate[requestedDate],
      embeddedDate: requestedDate,
      isAheadOfRequested: false,
    }
  }

  // Prefer the newest embedded day that is still on or before the requested date.
  const onOrBefore = keys.filter((k) => k <= requestedDate)
  if (onOrBefore.length === 0) {
    // Investing.com SSR is already on the next calendar day (common late CT / UTC rollover).
    const pickKey = keys[0]
    return {
      events: byDate[pickKey] || [],
      embeddedDate: pickKey,
      isAheadOfRequested: pickKey > requestedDate,
    }
  }

  const pickKey = onOrBefore[onOrBefore.length - 1]
  const bucket = byDate[pickKey] || []
  const onRequested = bucket.filter((e) => e?.date === requestedDate)
  return {
    events: onRequested.length > 0 ? onRequested : bucket,
    embeddedDate: pickKey,
    isAheadOfRequested: false,
  }
}

const INVESTING_PAGE_URL = 'https://www.investing.com/economic-calendar'
// Same XHR the investing.com "Today" tab uses (GMT-5 / US session). __NEXT_DATA__ alone is often tomorrow (UTC).
const LEGACY_CALENDAR_API_URL =
  'https://www.investing.com/economic-calendar/Service/getCalendarFilteredData?country=5&timeZone=8&timeFilter=timeRemain&currentTab=today&limit_from=0'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  Referer: 'https://www.investing.com/',
}

const LEGACY_HEADERS = {
  ...BROWSER_HEADERS,
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'X-Requested-With': 'XMLHttpRequest',
}

type FetchAttempt = { method: string; url: string; useProxyHeaders: boolean; headers: Record<string, string> }

function buildFetchAttempts(
  targetUrl: string,
  customProxyUrl: string | null,
  scraperApiKey: string | null,
  directHeaders: Record<string, string>,
  preferDirectFirst = false
): FetchAttempt[] {
  const attempts: FetchAttempt[] = []

  const directAttempt: FetchAttempt = {
    method: 'direct',
    url: targetUrl,
    useProxyHeaders: false,
    headers: directHeaders,
  }

  if (preferDirectFirst) {
    attempts.push(directAttempt)
  }

  if (customProxyUrl) {
    const proxyBase =
      customProxyUrl.startsWith('http://') || customProxyUrl.startsWith('https://')
        ? customProxyUrl
        : `https://${customProxyUrl}`
    attempts.push({
      method: 'custom_proxy',
      url: `${proxyBase}?url=${encodeURIComponent(targetUrl)}`,
      useProxyHeaders: true,
      headers: directHeaders,
    })
  }

  if (scraperApiKey) {
    attempts.push({
      method: 'scraperapi',
      url: `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}`,
      useProxyHeaders: true,
      headers: directHeaders,
    })
  }

  if (!preferDirectFirst) {
    attempts.push(directAttempt)
  }

  return attempts
}

async function fetchWithAttempts(
  targetUrl: string,
  customProxyUrl: string | null,
  scraperApiKey: string | null,
  directHeaders: Record<string, string>,
  validate: (data: unknown) => boolean,
  label: string,
  preferDirectFirst = false
): Promise<{ body: string; method: string }> {
  const attempts = buildFetchAttempts(
    targetUrl,
    customProxyUrl,
    scraperApiKey,
    directHeaders,
    preferDirectFirst
  )
  const errors: string[] = []

  for (const attempt of attempts) {
    try {
      console.log(`[ECONOMIC CALENDAR] Trying ${label}:`, attempt.method, attempt.url.slice(0, 120))
      const response = await axios.get(attempt.url, {
        headers: attempt.useProxyHeaders ? {} : attempt.headers,
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      })

      const body =
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? '')

      console.log('[ECONOMIC CALENDAR] Response:', {
        label,
        method: attempt.method,
        status: response.status,
        length: body.length,
      })

      if (response.status === 403 || response.status === 429) {
        errors.push(`${attempt.method}: HTTP ${response.status}`)
        continue
      }
      if (response.status >= 400) {
        errors.push(`${attempt.method}: HTTP ${response.status}`)
        continue
      }
      if (!validate(body)) {
        errors.push(`${attempt.method}: unexpected payload`)
        continue
      }

      return { body, method: attempt.method }
    } catch (err: any) {
      errors.push(`${attempt.method}: ${err.message}`)
    }
  }

  throw new Error(`${label} failed (${errors.join('; ') || 'no methods'})`)
}

function parseLegacyTheDayIso(html: string): string | null {
  const m = html.match(/class="theDay"[^>]*>[^,]+,\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/)
  if (!m) return null
  const d = new Date(`${m[1]} ${m[2]}, ${m[3]} 12:00:00`)
  if (isNaN(d.getTime())) return null
  return getDateStringInTimeZone(ECONOMIC_CALENDAR_TIMEZONE, d)
}

function normalizeLegacyCell($: cheerio.CheerioAPI, $row: cheerio.Cheerio<any>, prefix: string): string | null {
  const cell = $row.find(`[id^="${prefix}"]`).first()
  if (!cell.length) return null
  const text = cell.find('span').first().text().trim() || cell.text().trim()
  if (!text || text === '&nbsp;' || text === '-' || text === 'TBD' || text === 'N/A') return null
  return text
}

function parseLegacyCalendarApi(body: string, requestedDate: string): ParseResult {
  const empty: ParseResult = { events: [], embeddedDate: null, isAheadOfRequested: false }
  let json: { data?: string }
  try {
    json = JSON.parse(body)
  } catch {
    return empty
  }

  const html = json?.data
  if (!html || typeof html !== 'string' || !html.includes('eventRowId')) {
    return empty
  }

  const embeddedDate = parseLegacyTheDayIso(html) || requestedDate
  const requestedSlash = requestedDate.replace(/-/g, '/')
  const $ = cheerio.load(`<table><tbody>${html}</tbody></table>`)
  const events: CalendarEvent[] = []

  $('tr[data-event-datetime]').each((index, element) => {
    const $row = $(element)
    const datetime = $row.attr('data-event-datetime') || ''
    if (datetime && !datetime.startsWith(requestedSlash)) return

    const flagText = $row.find('td.flagCur').text().replace(/\s+/g, ' ').trim()
    if (!flagText.includes('USD')) return

    const eventCell = $row.find('td.event').first()
    const eventName = eventCell.find('a').first().text().trim() || eventCell.text().trim()
    if (!eventName || /holiday/i.test(eventName)) return

    const impactIcons = $row.find('td.sentiment i.grayFullBullishIcon').length
    const impact = impactIcons >= 3 ? 3 : impactIcons === 2 ? 2 : impactIcons === 1 ? 1 : 2

    const time =
      $row.find('td.time').first().text().trim() ||
      (datetime.match(/\d{2}:\d{2}/)?.[0] ?? '08:30')

    const eventId = $row.attr('event_attr_ID') || String(index)

    events.push({
      id: `investing-${eventId}`,
      time,
      event: eventName,
      impact,
      country: 'United States',
      currency: 'USD',
      actual: normalizeLegacyCell($, $row, 'eventActual_'),
      forecast: normalizeLegacyCell($, $row, 'eventForecast_'),
      previous: normalizeLegacyCell($, $row, 'eventPrevious_'),
    })
  })

  return {
    events,
    embeddedDate,
    isAheadOfRequested: embeddedDate > requestedDate,
  }
}

async function fetchLegacyCalendar(
  customProxyUrl: string | null,
  scraperApiKey: string | null
): Promise<{ body: string; method: string }> {
  return fetchWithAttempts(
    LEGACY_CALENDAR_API_URL,
    customProxyUrl,
    scraperApiKey,
    LEGACY_HEADERS,
    (data) => typeof data === 'string' && data.includes('"data"') && data.includes('eventRowId'),
    'legacy-api',
    true
  )
}

async function fetchNextCalendarHtml(
  customProxyUrl: string | null,
  scraperApiKey: string | null
): Promise<{ html: string; method: string }> {
  const result = await fetchWithAttempts(
    INVESTING_PAGE_URL,
    customProxyUrl,
    scraperApiKey,
    BROWSER_HEADERS,
    (data) =>
      typeof data === 'string' &&
      data.length > 10_000 &&
      data.includes('__NEXT_DATA__') &&
      data.includes('calendarEventsByDate'),
    'next-page'
  )
  return { html: result.body, method: result.method }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || getEconomicCalendarDate()

  console.log(
    '[ECONOMIC CALENDAR] Fetching for calendar date (Central):',
    date,
    'timezone:',
    ECONOMIC_CALENDAR_TIMEZONE
  )

  const scraperApiKey = config.proxies.scraperApiKey
  const customProxyUrl = config.proxies.customProxyUrl
  let fetchMethod = 'unknown'
  let dataSource = 'investing.com'

  try {
    let parsed: ParseResult = { events: [], embeddedDate: null, isAheadOfRequested: false }

    try {
      const { body, method } = await fetchLegacyCalendar(customProxyUrl, scraperApiKey)
      fetchMethod = `${method}-legacy`
      parsed = parseLegacyCalendarApi(body, date)
      dataSource = 'investing.com-today-api'
      console.log('[ECONOMIC CALENDAR] Legacy Today API events:', parsed.events.length, {
        calendarDay: parsed.embeddedDate,
      })
    } catch (legacyErr: any) {
      console.warn('[ECONOMIC CALENDAR] Legacy API failed, falling back to __NEXT_DATA__:', legacyErr.message)
    }

    if (parsed.events.length === 0) {
      const { html, method } = await fetchNextCalendarHtml(customProxyUrl, scraperApiKey)
      fetchMethod = method
      parsed = parseNextData(html, date)
      dataSource = 'investing.com-next-data'
      console.log('[ECONOMIC CALENDAR] __NEXT_DATA__ events:', parsed.events.length, {
        calendarDay: parsed.embeddedDate,
      })
    }

    const { events: allEvents, embeddedDate, isAheadOfRequested } = parsed
    const calendarDay = embeddedDate || date
    console.log('[ECONOMIC CALENDAR] Final parse:', allEvents.length, {
      requestedDate: date,
      calendarDay,
      isAheadOfRequested,
      dataSource,
      fetchMethod,
    })

    if (allEvents.length === 0) {
      // Either we were blocked or the page structure changed again.
      console.error(
        '[ECONOMIC CALENDAR] No events parsed from __NEXT_DATA__. The page may be blocked or its structure changed.',
        { fetchMethod, dataSource }
      )
      return NextResponse.json(
        {
          events: [],
          count: 0,
          source: 'investing.com',
          date: calendarDay,
          requestedDate: date,
          isAheadOfRequested,
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
        source: dataSource,
        date: calendarDay,
        requestedDate: date,
        isAheadOfRequested,
        timezone: ECONOMIC_CALENDAR_TIMEZONE,
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
