/**
 * Trading Calendar Utility
 * Handles NYSE trading day calculations and finding prediction dates
 */

const NYSE_TIMEZONE = 'America/New_York'

/** Weekly predictions publish Fridays at 2:50 PM Central Time */
export const WEEKLY_PREDICTION_TIMEZONE = 'America/Chicago'
export const WEEKLY_PREDICTION_CUTOFF_HOUR = 14
export const WEEKLY_PREDICTION_CUTOFF_MINUTE = 50

/**
 * Major NYSE holidays (MM-DD format)
 * Note: This is a simplified list. For production, consider using a comprehensive holiday calendar API
 */
const NYSE_HOLIDAYS: string[] = [
  '01-01', // New Year's Day
  '01-15', // Martin Luther King Jr. Day (3rd Monday, simplified)
  '02-19', // Presidents' Day (3rd Monday, simplified)
  '03-29', // Good Friday (varies, simplified)
  '05-27', // Memorial Day (last Monday, simplified)
  '06-19', // Juneteenth
  '07-04', // Independence Day
  '09-02', // Labor Day (1st Monday, simplified)
  '11-28', // Thanksgiving (4th Thursday, simplified)
  '12-25', // Christmas
]

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

/**
 * Check if a date matches a holiday pattern
 * This is a simplified check - for production, use actual holiday dates
 */
function isHoliday(date: Date): boolean {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${month}-${day}`
  
  // Check if it's a known holiday
  if (NYSE_HOLIDAYS.includes(dateStr)) {
    return true
  }
  
  // Check for observed holidays (if holiday falls on weekend)
  // This is simplified - actual NYSE rules are more complex
  const dayOfWeek = date.getDay()
  
  // If Monday and previous Friday was a holiday
  if (dayOfWeek === 1) {
    const prevFriday = new Date(date)
    prevFriday.setDate(date.getDate() - 3)
    const prevMonth = String(prevFriday.getMonth() + 1).padStart(2, '0')
    const prevDay = String(prevFriday.getDate()).padStart(2, '0')
    if (NYSE_HOLIDAYS.includes(`${prevMonth}-${prevDay}`)) {
      return true
    }
  }
  
  // If Friday and next Monday is a holiday
  if (dayOfWeek === 5) {
    const nextMonday = new Date(date)
    nextMonday.setDate(date.getDate() + 3)
    const nextMonth = String(nextMonday.getMonth() + 1).padStart(2, '0')
    const nextDay = String(nextMonday.getDate()).padStart(2, '0')
    if (NYSE_HOLIDAYS.includes(`${nextMonth}-${nextDay}`)) {
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

