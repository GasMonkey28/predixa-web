'use client'

import { getDateStringInTimeZone } from '@/lib/trading-calendar'

const ET = 'America/New_York'

function etToday(): string {
  return getDateStringInTimeZone(ET)
}

/** Readable session label, e.g. "Wed, Jul 22". */
export function formatSessionDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function isSessionDateToday(dateStr: string): boolean {
  return Boolean(dateStr) && dateStr === etToday()
}

interface SessionDateBadgeProps {
  date: string
  /** Optional label above the date (e.g. "Session date"). */
  label?: string
  className?: string
  /** Compact inline variant for section headers. */
  compact?: boolean
}

/**
 * Makes session dates easy to scan: larger date + clear Today / Not today chip.
 * Compares against America/New_York calendar date.
 */
export default function SessionDateBadge({
  date,
  label = 'Session date',
  className = '',
  compact = false,
}: SessionDateBadgeProps) {
  if (!date) return null

  const today = isSessionDateToday(date)
  const display = formatSessionDateLabel(date)

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 ${className}`}
        title={`${label}: ${date} (ET)`}
      >
        <span className="text-sm font-semibold text-white tabular-nums">{display}</span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
            today
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}
        >
          {today ? 'Today' : 'Not today'}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-stretch rounded-lg border overflow-hidden ${
        today
          ? 'border-emerald-500/40 bg-emerald-950/40'
          : 'border-amber-500/40 bg-amber-950/30'
      } ${className}`}
      title={`${date} (America/New_York)`}
    >
      <div className="px-3 py-1.5">
        <div className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium">
          {label}
        </div>
        <div className="text-sm font-semibold text-white tabular-nums leading-tight">
          {display}
        </div>
        <div className="text-[10px] text-zinc-500 tabular-nums">{date}</div>
      </div>
      <div
        className={`px-2.5 flex items-center justify-center text-[11px] font-bold uppercase tracking-wide min-w-[4.5rem] ${
          today
            ? 'bg-emerald-500/30 text-emerald-200'
            : 'bg-amber-500/25 text-amber-200'
        }`}
      >
        {today ? 'Today' : 'Not today'}
      </div>
    </div>
  )
}
