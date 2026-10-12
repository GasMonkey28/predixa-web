/**
 * Trading Calendar Utility
 * Handles NYSE trading day calculations and finding prediction dates
 */

const NYSE_TIMEZONE = 'America/New_York'

/** Weekly predictions publish Fridays at 2:50 PM Central Time */
export const WEEKLY_PREDICTION_TIMEZONE = 'America/Chicago'

/** Economic calendar day + release times (US traders, Central Time). */
export const ECONOMIC_CALENDAR_TIMEZONE = 'America/Chicago'

/** YYYY-MM-DD for a given instant in an IANA timezone (avoids UTC day rollover). */
export function getDateStringInTimeZone(timeZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getEconomicCalendarDate(date: Date = new Date()): string {
  return getDateStringInTimeZone(ECONOMIC_CALENDAR_TIMEZONE, date)
}
export const WEEKLY_PREDICTION_CUTOFF_HOUR = 14
export const WEEKLY_PREDICTION_CUTOFF_MINUTE = 50

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

function formatCalendarDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function dateFromDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Noon UTC always belongs to this NYSE calendar date, regardless of host timezone.
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function shiftDateStr(dateStr: string, days: number): string {
  const date = dateFromDateStr(dateStr)
  date.setUTCDate(date.getUTCDate() + days)
  return getDateStringInTimeZone(NYSE_TIMEZONE, date)
}

function getDayOfWeekFromDateStr(dateStr: string): number {
  return dateFromDateStr(dateStr).getUTCDay()
}

type TimeZoneParts = {
  year: number
  month: number
  day: number
  dayOfWeek: number
  hour: number
  minute: number
}

function getTimeZoneParts(timeZone: string, fromDate: Date = new Date()): TimeZoneParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(fromDate)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  ) as Record<string, string>

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    dayOfWeek: WEEKDAY_MAP[parts.weekday] ?? 0,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  }
}

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, n: number): string {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay()
  return formatCalendarDate(year, monthIndex + 1, 1 + (weekday - firstWeekday + 7) % 7 + 7 * (n - 1))
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number): string {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0))
  return formatCalendarDate(year, monthIndex + 1, last.getUTCDate() - (last.getUTCDay() - weekday + 7) % 7)
}

/** Gregorian Easter (Meeus/Jones/Butcher); Good Friday is two days earlier. */
function goodFriday(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = (h + l - 7 * m + 114) % 31 + 1
  return shiftDateStr(formatCalendarDate(year, month, day), -2)
}

// Extraordinary full-day closures since the modern MLK calendar began in 1998.
// Future exceptional closures must be added when announced by the exchange.
const EXTRA_NYSE_CLOSURES = new Set([
  '2001-09-11', '2001-09-12', '2001-09-13', '2001-09-14',
  '2004-06-11', '2007-01-02', '2012-10-29', '2012-10-30',
  '2018-12-05', '2025-01-09',
])
const holidayCache = new Map<number, Set<string>>()

/**
 * NYSE full-day closures, not US federal holidays. Early closes remain sessions.
 * Rules: https://www.nyse.com/trade/hours-calendars
 * In particular, Saturday New Year's Day is NOT observed on the prior Friday.
 */
function getNyseHolidayDates(year: number): Set<string> {
  const cached = holidayCache.get(year)
  if (cached) return cached

  const dates = new Set<string>([
    nthWeekdayOfMonth(year, 1, 1, 3), // Presidents' Day
    goodFriday(year),
    lastWeekdayOfMonth(year, 4, 1), // Memorial Day
    nthWeekdayOfMonth(year, 8, 1, 1), // Labor Day
    nthWeekdayOfMonth(year, 10, 4, 4), // Thanksgiving
  ])
  if (year >= 1998) dates.add(nthWeekdayOfMonth(year, 0, 1, 3)) // MLK Day

  const addFixedHoliday = (month: number, day: number, observeSaturday = true) => {
    const date = formatCalendarDate(year, month, day)
    const weekday = getDayOfWeekFromDateStr(date)
    dates.add(date)
    if (weekday === 0) dates.add(shiftDateStr(date, 1))
    if (weekday === 6 && observeSaturday) dates.add(shiftDateStr(date, -1))
  }
  addFixedHoliday(1, 1, false)
  if (year >= 2022) addFixedHoliday(6, 19)
  addFixedHoliday(7, 4)
  addFixedHoliday(12, 25)
  holidayCache.set(year, dates)
  return dates
}

function isHolidayDateStr(dateStr: string): boolean {
  return EXTRA_NYSE_CLOSURES.has(dateStr) || getNyseHolidayDates(Number(dateStr.slice(0, 4))).has(dateStr)
}

/**
 * Check if a date is a NYSE trading day
 */
export function isTradingDay(date: Date): boolean {
  const dateStr = getDateStringInTimeZone(NYSE_TIMEZONE, date)
  const dayOfWeek = getDayOfWeekFromDateStr(dateStr)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false
  }
  return !isHolidayDateStr(dateStr)
}

/**
 * Get the previous trading day
 */
export function getPreviousTradingDay(fromDate: Date = new Date()): Date {
  let dateStr = getDateStringInTimeZone(NYSE_TIMEZONE, fromDate)
  do {
    dateStr = shiftDateStr(dateStr, -1)
  } while (!isTradingDay(dateFromDateStr(dateStr)))
  return dateFromDateStr(dateStr)
}

/**
 * Most recent calendar Friday (NYSE timezone), even when the exchange is closed.
 * Weekly prediction files in S3 are keyed by this date (e.g. Juneteenth Friday).
 */
export function findLastCalendarFriday(fromDate: Date = new Date()): Date {
  let dateStr = getDateStringInTimeZone(NYSE_TIMEZONE, fromDate)

  for (let i = 0; i < 10; i++) {
    if (getDayOfWeekFromDateStr(dateStr) === 5) {
      return dateFromDateStr(dateStr)
    }
    dateStr = shiftDateStr(dateStr, -1)
  }

  return getPreviousTradingDay(fromDate)
}

/**
 * Calendar Friday one week before findLastCalendarFriday(fromDate).
 */
export function findPreviousWeekCalendarFriday(fromDate: Date = new Date()): Date {
  const lastFriday = findLastCalendarFriday(fromDate)
  const previousWeek = new Date(lastFriday)
  previousWeek.setUTCDate(previousWeek.getUTCDate() - 7)
  return previousWeek
}

/**
 * Candidate S3 keys for recent weekly publishes (calendar Friday + Monday substitute).
 */
export function getWeeklyPublishCandidateDates(fromDate: Date = new Date(), weeksBack = 5): string[] {
  const seen = new Set<string>()
  const dates: string[] = []
  let friday = findLastCalendarFriday(fromDate)
  const asOfDate = formatDateYYYYMMDD(fromDate)

  for (let week = 0; week < weeksBack; week++) {
    const candidates = [
      formatDateYYYYMMDD(friday),
      formatDateYYYYMMDD(findLastFridayOrMonday(friday)),
    ]
    // Some publishers defer a closed Friday to Monday. Never fetch a future key.
    const nextMonday = shiftDateStr(formatDateYYYYMMDD(friday), 3)
    if (!isTradingDay(friday) && nextMonday <= asOfDate && isTradingDay(dateFromDateStr(nextMonday))) {
      candidates.push(nextMonday)
    }
    for (const candidate of candidates) {
      if (!seen.has(candidate)) {
        seen.add(candidate)
        dates.push(candidate)
      }
    }
    const previousWeek = new Date(friday)
    previousWeek.setUTCDate(previousWeek.getUTCDate() - 7)
    friday = previousWeek
  }

  return dates
}

export type WeeklyPredictionRole = 'next' | 'current' | 'previous'

/** Classify which chart band a prediction belongs in for the anchor trading day. */
export function classifyWeeklyPredictionRole(
  fwdJoinDate: string,
  anchor: Date
): WeeklyPredictionRole | null {
  const anchorStr = formatDateYYYYMMDD(anchor)
  const { monday, friday } = getWeekDateRange(parseDateYYYYMMDD(fwdJoinDate))
  const monStr = formatDateYYYYMMDD(monday)
  const friStr = formatDateYYYYMMDD(friday)

  if (anchorStr < monStr) {
    return 'next'
  }
  if (anchorStr >= monStr && anchorStr <= friStr) {
    return 'current'
  }
  if (anchorStr > friStr) {
    return 'previous'
  }
  return null
}

/**
 * Find the last Friday (or Monday if Friday is a holiday)
 * Works backwards from the given date
 */
export function findLastFridayOrMonday(fromDate: Date = new Date()): Date {
  let dateStr = getDateStringInTimeZone(NYSE_TIMEZONE, fromDate)

  for (let i = 0; i < 7; i++) {
    const dayOfWeek = getDayOfWeekFromDateStr(dateStr)
    const date = dateFromDateStr(dateStr)

    if (dayOfWeek === 5 && isTradingDay(date)) {
      return date
    }

    if (dayOfWeek === 1 && isTradingDay(date)) {
      const prevFriday = dateFromDateStr(shiftDateStr(dateStr, -3))
      if (!isTradingDay(prevFriday)) {
        return date
      }
    }

    dateStr = shiftDateStr(dateStr, -1)
  }

  return getPreviousTradingDay(fromDate)
}

/**
 * Find the previous week's Friday (two weeks ago)
 * Used to get the previous week's prediction
 */
export function findPreviousWeekFriday(fromDate: Date = new Date()): Date {
  // First find the current week's Friday
  const currentWeekFriday = findLastFridayOrMonday(fromDate)
  
  // Go back one week from that Friday
  const previousWeekDate = new Date(currentWeekFriday)
  previousWeekDate.setUTCDate(previousWeekDate.getUTCDate() - 7)
  
  // Find the Friday of that week (or Monday if Friday was holiday)
  return findLastFridayOrMonday(previousWeekDate)
}

/**
 * Current time as a Date in the given IANA timezone (wall-clock fields).
 */
export function getNowInTimeZone(timeZone: string, fromDate: Date = new Date()): Date {
  const parts = getTimeZoneParts(timeZone, fromDate)
  const date = new Date()
  date.setFullYear(parts.year, parts.month - 1, parts.day)
  date.setHours(parts.hour, parts.minute, 0, 0)
  return date
}

/**
 * True on Fridays at or after 2:50 PM Central (weekly prediction publish time).
 */
export function isFridayAfterWeeklyPredictionCutoff(fromDate: Date = new Date()): boolean {
  const ct = getTimeZoneParts(WEEKLY_PREDICTION_TIMEZONE, fromDate)
  if (ct.dayOfWeek !== 5) {
    return false
  }
  return (
    ct.hour > WEEKLY_PREDICTION_CUTOFF_HOUR ||
    (ct.hour === WEEKLY_PREDICTION_CUTOFF_HOUR && ct.minute >= WEEKLY_PREDICTION_CUTOFF_MINUTE)
  )
}

/**
 * Calendar Friday of the Mon–Sun week containing fromDate, including holidays.
 */
export function findCalendarFridayOfWeekContaining(fromDate: Date = new Date()): Date {
  let dateStr = getDateStringInTimeZone(NYSE_TIMEZONE, fromDate)
  const day = getDayOfWeekFromDateStr(dateStr)

  if (day === 6) {
    dateStr = shiftDateStr(dateStr, -1)
  } else if (day === 0) {
    dateStr = shiftDateStr(dateStr, -2)
  } else {
    dateStr = shiftDateStr(dateStr, 5 - day)
  }

  return dateFromDateStr(dateStr)
}

/** Friday (or earlier Monday substitute) for callers that require a session. */
export function findFridayOfWeekContaining(fromDate: Date = new Date()): Date {
  const friday = findCalendarFridayOfWeekContaining(fromDate)
  const dateStr = formatDateYYYYMMDD(friday)
  if (getDayOfWeekFromDateStr(dateStr) === 5 && !isTradingDay(friday)) {
    const monday = dateFromDateStr(shiftDateStr(dateStr, -4))
    if (isTradingDay(monday)) {
      return monday
    }
  }

  return friday
}

/**
 * Friday of the calendar week after the week containing fromDate.
 */
export function findNextWeekFriday(fromDate: Date = new Date()): Date {
  const thisWeekFriday = findFridayOfWeekContaining(fromDate)
  const next = new Date(thisWeekFriday)
  next.setUTCDate(next.getUTCDate() + 7)
  return findFridayOfWeekContaining(next)
}

/**
 * Anchor date for weekly prediction labels: today on trading days, else last session.
 * Keeps "next week" stable through Monday holidays before the new week opens.
 */
export function getMarketAnchorDate(fromDate: Date = new Date()): Date {
  const date = dateFromDateStr(getDateStringInTimeZone(NYSE_TIMEZONE, fromDate))
  if (isTradingDay(date)) {
    return date
  }
  return getPreviousTradingDay(fromDate)
}

export function parseDateYYYYMMDD(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Noon UTC always belongs to this NYSE calendar date, regardless of host timezone.
  return new Date(Date.UTC(year, month - 1, day, 12))
}

/** True when a prediction's fwd_join week overlaps the Mon–Fri span for weekFriday. */
export function fwdJoinOverlapsWeek(fwdJoinDate: string, weekFriday: Date): boolean {
  const predRange = getWeekDateRange(parseDateYYYYMMDD(fwdJoinDate))
  const weekRange = getWeekDateRange(weekFriday)
  const predMon = formatDateYYYYMMDD(predRange.monday)
  const predFri = formatDateYYYYMMDD(predRange.friday)
  const weekMon = formatDateYYYYMMDD(weekRange.monday)
  const weekFri = formatDateYYYYMMDD(weekRange.friday)
  return predMon <= weekFri && predFri >= weekMon
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDateYYYYMMDD(date: Date): string {
  return getDateStringInTimeZone(NYSE_TIMEZONE, date)
}

/**
 * Get the Monday-Friday date range for a given Friday date
 * Returns the Monday and Friday of that trading week
 * Dates are normalized to avoid timezone issues when comparing
 */
export function getWeekDateRange(fridayDate: Date): { monday: Date; friday: Date } {
  const fridayStr = formatDateYYYYMMDD(fridayDate)
  const friday = dateFromDateStr(fridayStr)
  let mondayStr = shiftDateStr(fridayStr, -4)
  // Date-only arithmetic must not depend on the browser/server timezone or DST.
  while (!isTradingDay(dateFromDateStr(mondayStr)) && mondayStr < fridayStr) {
    mondayStr = shiftDateStr(mondayStr, 1)
  }
  return { monday: dateFromDateStr(mondayStr), friday }
}
