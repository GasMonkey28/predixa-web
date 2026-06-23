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
  const date = new Date()
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return date
}

function shiftDateStr(dateStr: string, days: number): string {
  const date = dateFromDateStr(dateStr)
  date.setDate(date.getDate() + days)
  return getDateStringInTimeZone(NYSE_TIMEZONE, date)
}

function getDayOfWeekFromDateStr(dateStr: string, timeZone: string = NYSE_TIMEZONE): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(dateFromDateStr(dateStr))
  return WEEKDAY_MAP[weekday] ?? 0
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
    hour12: false,
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

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, n: number): Date {
  let count = 0
  const cursor = new Date(year, monthIndex, 1)
  while (cursor.getMonth() === monthIndex) {
    if (cursor.getDay() === weekday) {
      count++
      if (count === n) {
        return new Date(cursor)
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  throw new Error(`Could not find weekday ${weekday} occurrence ${n} in month ${monthIndex}`)
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number): Date {
  const cursor = new Date(year, monthIndex + 1, 0)
  while (cursor.getDay() !== weekday) {
    cursor.setDate(cursor.getDate() - 1)
  }
  return cursor
}

/** NYSE full-day closures for a calendar year (floating + fixed dates). */
function getNyseHolidayDates(year: number): Set<string> {
  const dates = new Set<string>([
    formatCalendarDate(year, 1, 1),
    formatDateYYYYMMDD(nthWeekdayOfMonth(year, 0, 1, 3)), // MLK Day
    formatDateYYYYMMDD(nthWeekdayOfMonth(year, 1, 1, 3)), // Presidents' Day
    formatDateYYYYMMDD(lastWeekdayOfMonth(year, 4, 1)), // Memorial Day
    formatCalendarDate(year, 6, 19), // Juneteenth
    formatCalendarDate(year, 7, 4), // Independence Day
    formatDateYYYYMMDD(nthWeekdayOfMonth(year, 8, 1, 1)), // Labor Day
    formatDateYYYYMMDD(nthWeekdayOfMonth(year, 10, 4, 4)), // Thanksgiving
    formatCalendarDate(year, 12, 25), // Christmas
  ])
  return dates
}

/**
 * Check if a date is an NYSE holiday (year-aware floating Mondays/Thursdays).
 */
function isHolidayDateStr(dateStr: string): boolean {
  const year = Number(dateStr.slice(0, 4))

  if (getNyseHolidayDates(year).has(dateStr)) {
    return true
  }

  const dayOfWeek = getDayOfWeekFromDateStr(dateStr)
  if (dayOfWeek === 1) {
    const prevSunday = shiftDateStr(dateStr, -1)
    if (getNyseHolidayDates(Number(prevSunday.slice(0, 4))).has(prevSunday)) {
      return true
    }
  }
  if (dayOfWeek === 5) {
    const nextSaturday = shiftDateStr(dateStr, 1)
    if (getNyseHolidayDates(Number(nextSaturday.slice(0, 4))).has(nextSaturday)) {
      return true
    }
  }

  return false
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
  previousWeek.setDate(previousWeek.getDate() - 7)
  return previousWeek
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
  previousWeekDate.setDate(previousWeekDate.getDate() - 7)
  
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
 * Friday (or Monday substitute) of the Mon–Sun calendar week containing fromDate.
 */
export function findFridayOfWeekContaining(fromDate: Date = new Date()): Date {
  let dateStr = getDateStringInTimeZone(NYSE_TIMEZONE, fromDate)
  const day = getDayOfWeekFromDateStr(dateStr)

  if (day === 6) {
    dateStr = shiftDateStr(dateStr, -1)
  } else if (day === 0) {
    dateStr = shiftDateStr(dateStr, -2)
  } else {
    dateStr = shiftDateStr(dateStr, 5 - day)
  }

  const friday = dateFromDateStr(dateStr)
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
  next.setDate(next.getDate() + 7)
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
  const date = new Date()
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return date
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
  // Create a copy and normalize to avoid timezone issues
  const friday = new Date(fridayDate)
  // Set to noon to avoid timezone edge cases
  friday.setHours(12, 0, 0, 0)
  
  const monday = new Date(friday)
  // Go back to Monday (4 days before Friday)
  monday.setDate(friday.getDate() - 4)
  monday.setHours(0, 0, 0, 0) // Start of day
  
  // Adjust if Monday was a holiday (go to next trading day)
  while (!isTradingDay(monday) && monday < friday) {
    monday.setDate(monday.getDate() + 1)
  }
  
  // Set Friday to start of day (we compare dates as strings, so time doesn't matter)
  friday.setHours(0, 0, 0, 0)
  
  return { monday, friday }
}

