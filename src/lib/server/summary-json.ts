import axios from 'axios'

const MAX_LOOKBACK_DAYS = 10

export function etDateString(daysAgo = 0): string {
  const etTimeZone = 'America/New_York'
  const now = new Date()
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: etTimeZone }))
  etDate.setDate(etDate.getDate() - daysAgo)
  return etDate.toLocaleDateString('en-CA')
}

export function subtractDaysFromDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10))
  const base = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  base.setUTCDate(base.getUTCDate() - days)
  return base.toISOString().slice(0, 10)
}

function summaryUrl(bucket: string, date: string): string {
  return `https://${bucket}.s3.amazonaws.com/summary_json/${date}.json`
}

const fetchHeaders = {
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
}

export async function fetchSummaryForDate(
  bucket: string,
  date: string
): Promise<Record<string, unknown>> {
  const response = await axios.get(summaryUrl(bucket, date), { headers: fetchHeaders })
  return response.data as Record<string, unknown>
}

/** Walk back up to MAX_LOOKBACK_DAYS to find the newest available summary_json file. */
export async function fetchLatestSummary(
  bucket: string,
  startDate?: string
): Promise<{ date: string; data: Record<string, unknown> }> {
  const firstDate = startDate ?? etDateString(0)
  let lastError: unknown

  for (let offset = 0; offset < MAX_LOOKBACK_DAYS; offset++) {
    const date = subtractDaysFromDate(firstDate, offset)
    try {
      const data = await fetchSummaryForDate(bucket, date)
      return { date, data }
    } catch (err) {
      lastError = err
    }
  }

  throw lastError ?? new Error('No summary_json file found within lookback window')
}

/** Previous trading summary strictly before the given date (skips missing days). */
export async function fetchPreviousSummary(
  bucket: string,
  beforeDate: string
): Promise<{ date: string; data: Record<string, unknown> } | null> {
  for (let offset = 1; offset <= MAX_LOOKBACK_DAYS; offset++) {
    const date = subtractDaysFromDate(beforeDate, offset)
    try {
      const data = await fetchSummaryForDate(bucket, date)
      return { date, data }
    } catch {
      // keep walking back
    }
  }
  return null
}
