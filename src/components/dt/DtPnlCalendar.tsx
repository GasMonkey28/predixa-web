'use client'

import { useMemo, useState, type CSSProperties } from 'react'

import type { DtPnlDay, DtPnlMonth, DtPnlSnapshot } from '@/lib/dt-pnl-types'

function money(n: number | null | undefined, showPlus = true): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : showPlus && n > 0 ? '+' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

function pnlTone(n: number): string {
  if (n > 0) return 'text-emerald-300'
  if (n < 0) return 'text-rose-300'
  return 'text-zinc-300'
}

function cellStyle(pnl: number | null, maxAbs: number): CSSProperties {
  if (pnl == null || pnl === 0 || maxAbs <= 0) {
    return { backgroundColor: 'rgba(24,24,27,0.45)' }
  }
  const intensity = Math.min(1, Math.abs(pnl) / maxAbs)
  const alpha = 0.14 + intensity * 0.42
  if (pnl > 0) return { backgroundColor: `rgba(16, 185, 129, ${alpha})` }
  return { backgroundColor: `rgba(244, 63, 94, ${alpha})` }
}

function daysInMonthGrid(monthKey: string): { date: string | null }[] {
  const [y, m] = monthKey.split('-').map(Number)
  if (!y || !m) return []
  const first = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0))
  const utcDow = first.getUTCDay()
  const mondayIndex = (utcDow + 6) % 7
  const dim = new Date(Date.UTC(y, m, 0, 12, 0, 0)).getUTCDate()

  const cells: { date: string | null }[] = []
  for (let i = 0; i < mondayIndex; i++) cells.push({ date: null })
  for (let d = 1; d <= dim; d++) {
    cells.push({
      date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null })
  return cells
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DtPnlCalendar({
  assetLabel,
  snapshot,
  loading,
  onRefresh,
}: {
  assetLabel: string
  snapshot: DtPnlSnapshot | null
  loading?: boolean
  onRefresh: () => void
}) {
  const monthKeys = useMemo(() => {
    if (!snapshot?.months.length) {
      const today = snapshot?.today || new Date().toISOString().slice(0, 10)
      return [today.slice(0, 7)]
    }
    return snapshot.months.map((m) => m.monthKey)
  }, [snapshot])

  const defaultMonth =
    snapshot?.today?.slice(0, 7) ||
    monthKeys[monthKeys.length - 1] ||
    new Date().toISOString().slice(0, 10).slice(0, 7)

  const [monthKey, setMonthKey] = useState(defaultMonth)
  const activeMonth = monthKeys.includes(monthKey) ? monthKey : defaultMonth

  const dayMap = useMemo(() => {
    const map = new Map<string, DtPnlDay>()
    for (const d of snapshot?.days ?? []) map.set(d.date, d)
    return map
  }, [snapshot])

  const monthMeta: DtPnlMonth | null =
    snapshot?.months.find((m) => m.monthKey === activeMonth) ?? null

  const monthDays = useMemo(() => {
    return (snapshot?.days ?? []).filter((d) => d.date.startsWith(activeMonth))
  }, [snapshot, activeMonth])

  const maxAbs = useMemo(() => {
    let max = 0
    for (const d of monthDays) max = Math.max(max, Math.abs(d.pnl))
    return max || 1
  }, [monthDays])

  const grid = useMemo(() => daysInMonthGrid(activeMonth), [activeMonth])
  const monthIndex = monthKeys.indexOf(activeMonth)

  const goPrev = () => {
    if (monthIndex > 0) setMonthKey(monthKeys[monthIndex - 1]!)
    else {
      const [y, m] = activeMonth.split('-').map(Number)
      setMonthKey(m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`)
    }
  }

  const goNext = () => {
    if (monthIndex >= 0 && monthIndex < monthKeys.length - 1) {
      setMonthKey(monthKeys[monthIndex + 1]!)
    } else {
      const [y, m] = activeMonth.split('-').map(Number)
      setMonthKey(m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`)
    }
  }

  const monthLabel = (() => {
    const [y, m] = activeMonth.split('-').map(Number)
    if (!y || !m) return activeMonth
    return new Date(Date.UTC(y, m - 1, 1, 12)).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  })()

  const profitDays = monthMeta?.profitDays ?? monthDays.filter((d) => d.pnl > 0).length
  const lossDays = monthMeta?.lossDays ?? monthDays.filter((d) => d.pnl < 0).length
  const monthPnl = monthMeta?.pnl ?? monthDays.reduce((s, d) => s + d.pnl, 0)
  const accumulated = monthMeta?.accumulatedPnl ?? snapshot?.totals.accumulatedPnl ?? 0

  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/85 to-zinc-950/90 overflow-hidden">
      <header className="border-b border-zinc-800/80 px-4 py-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{assetLabel} P&amp;L calendar</h2>
          <p className="text-xs text-zinc-400 mt-1">
            P&amp;L on each position&apos;s open day · month totals · accumulated roll-up (TS fills ≤89d)
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-zinc-600 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 text-sm font-medium px-3 py-2"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800/50 border-b border-zinc-800/80">
        <div className="bg-zinc-950/80 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Month P&amp;L</div>
          <div className={`text-lg font-semibold tabular-nums ${pnlTone(monthPnl)}`}>
            {money(monthPnl)}
          </div>
        </div>
        <div className="bg-zinc-950/80 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Accumulated</div>
          <div className={`text-lg font-semibold tabular-nums ${pnlTone(accumulated)}`}>
            {money(accumulated)}
          </div>
        </div>
        <div className="bg-zinc-950/80 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Profit days</div>
          <div className="text-lg font-semibold tabular-nums text-emerald-300">{profitDays}</div>
          <div className="text-[10px] text-zinc-500">
            {lossDays} loss · {monthDays.length} active
          </div>
        </div>
        <div className="bg-zinc-950/80 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">All-time (window)</div>
          <div
            className={`text-lg font-semibold tabular-nums ${pnlTone(snapshot?.totals.pnl ?? 0)}`}
          >
            {money(snapshot?.totals.pnl ?? 0)}
          </div>
          <div className="text-[10px] text-zinc-500">
            {snapshot?.totals.profitDays ?? 0} profit days total
          </div>
        </div>
      </div>

      {snapshot?.months && snapshot.months.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-zinc-800/60">
          {snapshot.months.map((m) => (
            <button
              key={m.monthKey}
              type="button"
              onClick={() => setMonthKey(m.monthKey)}
              className={`min-w-[7.5rem] rounded-lg border px-3 py-2 text-left transition ${
                m.monthKey === activeMonth
                  ? 'border-sky-500/50 bg-sky-950/40'
                  : 'border-zinc-700/80 bg-zinc-900/50 hover:bg-zinc-800/60'
              }`}
            >
              <div className="text-[11px] text-zinc-500">{m.label}</div>
              <div className={`text-sm font-semibold tabular-nums ${pnlTone(m.pnl)}`}>
                {money(m.pnl)}
              </div>
              <div className="text-[10px] text-zinc-500">
                cum {money(m.accumulatedPnl)} · {m.profitDays}W/{m.lossDays}L
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs px-2.5 py-1.5"
        >
          ← Prev
        </button>
        <h3 className="text-sm font-semibold text-zinc-100">{monthLabel}</h3>
        <button
          type="button"
          onClick={goNext}
          className="rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs px-2.5 py-1.5"
        >
          Next →
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DOW.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] uppercase tracking-wide text-zinc-500 py-1"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, idx) => {
            if (!cell.date) {
              return <div key={`e-${idx}`} className="min-h-[4.25rem] rounded-md bg-transparent" />
            }
            const day = dayMap.get(cell.date)
            const pnl = day?.pnl ?? null
            const isToday = cell.date === snapshot?.today
            const dayNum = Number(cell.date.slice(8, 10))
            return (
              <div
                key={cell.date}
                title={
                  day
                    ? `${cell.date}: ${money(day.pnl)} (realized ${money(day.realizedPnl)}, open ${money(day.openUnrealizedPnl)})`
                    : cell.date
                }
                className={`min-h-[4.25rem] rounded-md border p-1.5 flex flex-col ${
                  isToday ? 'border-sky-500/60' : 'border-zinc-800/70'
                }`}
                style={cellStyle(pnl, maxAbs)}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[11px] ${isToday ? 'text-sky-300 font-semibold' : 'text-zinc-400'}`}
                  >
                    {dayNum}
                  </span>
                  {day && day.pnl > 0 && (
                    <span className="text-[9px] text-emerald-300/90 font-medium">W</span>
                  )}
                  {day && day.pnl < 0 && (
                    <span className="text-[9px] text-rose-300/90 font-medium">L</span>
                  )}
                </div>
                {day ? (
                  <>
                    <div
                      className={`mt-auto text-[11px] font-semibold tabular-nums leading-tight ${pnlTone(day.pnl)}`}
                    >
                      {money(day.pnl)}
                    </div>
                    {(day.openPositions > 0 || day.closedTrades > 0) && (
                      <div className="text-[9px] text-zinc-500 truncate">
                        {day.openPositions > 0 ? `${day.openPositions} open` : null}
                        {day.openPositions > 0 && day.closedTrades > 0 ? ' · ' : null}
                        {day.closedTrades > 0 ? `${day.closedTrades} closed` : null}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-auto text-[10px] text-zinc-600">—</div>
                )}
              </div>
            )
          })}
        </div>

        {!loading && (!snapshot || snapshot.days.length === 0) && (
          <p className="text-center text-sm text-zinc-500 mt-4 py-6 px-2">
            No DT P&amp;L days yet. Place/flatten paper trades on this sim account, then Refresh.
            Calendar builds from sim fills (last ~89 days) — no separate DynamoDB table.
          </p>
        )}
        {loading && !snapshot && (
          <p className="text-center text-sm text-zinc-500 mt-4 py-6">Loading P&amp;L calendar…</p>
        )}
      </div>
    </section>
  )
}
