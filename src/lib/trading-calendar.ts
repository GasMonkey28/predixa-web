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

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
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
    formatDateYYYYMMDD(new Date(year, 0, 1)),
    formatDateYYYYMMDD(nthWeekdayOfMonth(year, 0, 1, 3)), // MLK Day
    formatDateYYYYMMDD(nthWeekdayOfMonth(year, 1, 1, 3)), // Presidents' Day
    formatDateYYYYMMDD(lastWeekdayOfMonth(year, 4, 1)), // Memorial Day
    formatDateYYYYMMDD(new Date(year, 5, 19)), // Juneteenth
    formatDateYYYYMMDD(new Date(year, 6, 4)), // Independence Day
    formatDateYYYYMMDD(nthWeekdayOfMonth(year, 8, 1, 1)), // Labor Day
    formatDateYYYYMMDD(nthWeekdayOfMonth(year, 10, 4, 4)), // Thanksgiving
    formatDateYYYYMMDD(new Date(year, 11, 25)), // Christmas
  ])
  return dates
}

/**
 * Check if a date is an NYSE holiday (year-aware floating Mondays/Thursdays).
 */
function isHoliday(date: Date): boolean {
  const nyDate = new Date(date.toLocaleString('en-US', { timeZone: NYSE_TIMEZONE }))
  const year = nyDate.getFullYear()
  const dateStr = formatDateYYYYMMDD(nyDate)

  if (getNyseHolidayDates(year).has(dateStr)) {
    return true
  }

  // Observed: Sunday holiday closed -> following Monday
  const dayOfWeek = nyDate.getDay()
  if (dayOfWeek === 1) {
    const prevSunday = new Date(nyDate)
    prevSunday.setDate(nyDate.getDate() - 1)
    if (getNyseHolidayDates(prevSunday.getFullYear()).has(formatDateYYYYMMDD(prevSunday))) {
      return true
    }
  }
  // Observed: Saturday holiday closed -> preceding Friday
  if (dayOfWeek === 5) {
    const nextSaturday = new Date(nyDate)
    nextSaturday.setDate(nyDate.getDate() + 1)
    if (getNyseHolidayDates(nextSaturday.getFullYear()).has(formatDateYYYYMMDD(nextSaturday))) {
      return true
    }
  }

  return false
}

/**
 * Check if a date is a NYSE trading day
 */
export function isTradingDay(date: Date): boolean {
  // Convert to NY timezone
  const nyDate = new Date(date.toLocaleString('en-US', { timeZone: NYSE_TIMEZONE }))
  
  // Not a trading day if it's a weekend
  if (isWeekend(nyDate)) {
    return false
  }
  
  // Not a trading day if it's a holiday
  if (isHoliday(nyDate)) {
    return false
  }
  
  return true
}

/**
 * Get the previous trading day
 */
export function getPreviousTradingDay(fromDate: Date = new Date()): Date {
  const nyDate = new Date(fromDate.toLocaleString('en-US', { timeZone: NYSE_TIMEZONE }))
  let currentDate = new Date(nyDate)
  
  // Go back one day at a time until we find a trading day
  do {
    currentDate.setDate(currentDate.getDate() - 1)
  } while (!isTradingDay(currentDate))
  
  return currentDate
}

/**
 * Find the last Friday (or Monday if Friday is a holiday)
 * Works backwards from the given date
 */
export function findLastFridayOrMonday(fromDate: Date = new Date()): Date {
  const nyDate = new Date(fromDate.toLocaleString('en-US', { timeZone: NYSE_TIMEZONE }))
  let currentDate = new Date(nyDate)
  
  // Go back up to 7 days to find Friday
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = currentDate.getDay()
    
    // If it's Friday (5) and it's a trading day, return it
    if (dayOfWeek === 5 && isTradingDay(currentDate)) {
      return currentDate
    }
    
    // If it's Monday (1) and Friday was a holiday, check if this Monday is a trading day
    if (dayOfWeek === 1 && isTradingDay(currentDate)) {
      // Check if previous Friday was a holiday
      const prevFriday = new Date(currentDate)
      prevFriday.setDate(currentDate.getDate() - 3)
      if (!isTradingDay(prevFriday)) {
        // Friday was a holiday, so this Monday is when the prediction was made
        return currentDate
      }
    }
    
    // Go back one day
    currentDate.setDate(currentDate.getDate() - 1)
  }
  
  // Fallback: return the most recent trading day
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
  return new Date(fromDate.toLocaleString('en-US', { timeZone }))
}

/**
 * True on Fridays at or after 2:50 PM Central (weekly prediction publish time).
 */
export function isFridayAfterWeeklyPredictionCutoff(fromDate: Date = new Date()): boolean {
  const ct = getNowInTimeZone(WEEKLY_PREDICTION_TIMEZONE, fromDate)
  if (ct.getDay() !== 5) {
    return false
  }
  const hour = ct.getHours()
  const minute = ct.getMinutes()
  return (
    hour > WEEKLY_PREDICTION_CUTOFF_HOUR ||
    (hour === WEEKLY_PREDICTION_CUTOFF_HOUR && minute >= WEEKLY_PREDICTION_CUTOFF_MINUTE)
  )
}

/**
 * Friday (or Monday substitute) of the Mon–Sun calendar week containing fromDate.
 */
export function findFridayOfWeekContaining(fromDate: Date = new Date()): Date {
  const nyDate = new Date(fromDate.toLocaleString('en-US', { timeZone: NYSE_TIMEZONE }))
  const d = new Date(nyDate)

  const day = d.getDay()
  if (day === 6) {
    d.setDate(d.getDate() - 1)
  } else if (day === 0) {
    d.setDate(d.getDate() - 2)
  } else {
    d.setDate(d.getDate() + (5 - day))
  }

  if (d.getDay() === 5 && !isTradingDay(d)) {
    const monday = new Date(d)
    monday.setDate(d.getDate() - 4)
    if (isTradingDay(monday)) {
      return monday
    }
  }

  return d
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
  const nyDate = new Date(fromDate.toLocaleString('en-US', { timeZone: NYSE_TIMEZONE }))
  if (isTradingDay(nyDate)) {
    return nyDate
  }
  return getPreviousTradingDay(nyDate)
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
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

