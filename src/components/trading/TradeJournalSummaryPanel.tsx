'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { loadTradeJournal } from '@/lib/trade-journal-storage'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import {
  INSTRUMENT_OPTIONS,
  calcMonthlyProfitSummaries,
  calcOpenPositionSummary,
  getCurrentMonthKey,
  getEntryProfit,
  getTradeNumber,
  isOpenPosition,
  sortEntriesByEntryDate,
  type TradeJournalEntry,
} from '@/lib/trade-journal-types'

function instrumentLabel(type: TradeJournalEntry['instrumentType']): string {
  return INSTRUMENT_OPTIONS.find((o) => o.value === type)?.shortLabel ?? type
}

function formatMoney(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

function formatPrice(value: number | null): string {
  if (value == null) return '—'
  return Math.abs(value).toFixed(2)
}

export default function TradeJournalSummaryPanel() {
  const { user } = useAuthStore()
  const [entries, setEntries] = useState<TradeJournalEntry[]>([])
  const [monthTotal, setMonthTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await loadTradeJournal(user?.userId)
      setEntries(data.entries)
      const monthKey = getCurrentMonthKey()
      const summaries = calcMonthlyProfitSummaries(data.entries, data.monthlyProfitEntries)
      const current = summaries.find((s) => s.monthKey === monthKey)
      setMonthTotal(current?.total ?? 0)
    } catch {
      setEntries([])
      setMonthTotal(0)
    } finally {
      setLoading(false)
    }
  }, [user?.userId])

  useEffect(() => {
    void load()
  }, [load])

  useAutoRefresh(load)

  const positionSummary = useMemo(() => calcOpenPositionSummary(entries), [entries])

  const openEntries = useMemo(() => {
    return entries
      .filter(isOpenPosition)
      .sort((a, b) => {
        const na = getTradeNumber(entries, a.id) ?? 0
        const nb = getTradeNumber(entries, b.id) ?? 0
        // Longs first (positive), then shorts by magnitude
        if (na > 0 && nb > 0) return na - nb
        if (na < 0 && nb < 0) return na - nb
        return nb - na
      })
  }, [entries])

  const recentClosed = useMemo(() => {
    return sortEntriesByEntryDate(
      entries.filter((e) => e.soldPrice != null && getEntryProfit(e) != null),
      'desc'
    ).slice(0, 5)
  }, [entries])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 flex-1">
        <div className="h-6 bg-zinc-700/50 rounded w-1/2" />
        <div className="h-16 bg-zinc-700/50 rounded" />
        <div className="h-24 bg-zinc-700/50 rounded" />
        <div className="h-24 bg-zinc-700/50 rounded" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-4 w-4 text-blue-400 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">Trade journal</h3>
            <p className="text-[11px] text-zinc-400">Open positions & recent P&L</p>
          </div>
        </div>
        <Link
          href="/trade-journal"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-300 hover:text-blue-200 shrink-0"
        >
          Open
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-3 shrink-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">
            Journal net
          </span>
          <span
            className={`text-2xl font-bold tabular-nums ${
              positionSummary.netPosition > 0
                ? 'text-emerald-400'
                : positionSummary.netPosition < 0
                  ? 'text-red-400'
                  : 'text-zinc-300'
            }`}
          >
            {positionSummary.netPosition > 0 ? '+' : ''}
            {positionSummary.netPosition}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs tabular-nums">
          <span className="text-zinc-500">
            Long{' '}
            <span className="font-semibold text-emerald-400">
              {positionSummary.highestLong > 0 ? positionSummary.highestLong : '—'}
            </span>
          </span>
          <span className="text-zinc-500">
            Short{' '}
            <span className="font-semibold text-red-400">
              {positionSummary.highestShort < 0 ? positionSummary.highestShort : '—'}
            </span>
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-zinc-800 flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-zinc-500">This month P&L</span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              monthTotal > 0
                ? 'text-emerald-400'
                : monthTotal < 0
                  ? 'text-red-400'
                  : 'text-zinc-400'
            }`}
          >
            {formatMoney(monthTotal)}
          </span>
        </div>
      </div>

      <div className="flex flex-col min-h-0 flex-1 gap-2">
        <h4 className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium shrink-0">
          Open ({openEntries.length})
        </h4>
        {openEntries.length === 0 ? (
          <p className="text-xs text-zinc-500">No open positions.</p>
        ) : (
          <ul className="space-y-1.5 overflow-y-auto min-h-0 pr-0.5">
            {openEntries.map((entry) => {
              const tradeNo = getTradeNumber(entries, entry.id)
              const isShort = (entry.buyPrice ?? 0) < 0
              return (
                <li
                  key={entry.id}
                  className="rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        isShort ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      #{tradeNo ?? '—'} {isShort ? 'Short' : 'Long'}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {instrumentLabel(entry.instrumentType)} ×{entry.positionSize}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                    <span>@ {formatPrice(entry.buyPrice)}</span>
                    <span className="tabular-nums">{entry.entryDate}</span>
                  </div>
                  {entry.reason ? (
                    <p className="mt-1 text-[10px] text-zinc-500 line-clamp-2">{entry.reason}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-2">
        <h4 className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">
          Recent closed
        </h4>
        {recentClosed.length === 0 ? (
          <p className="text-xs text-zinc-500">No closed trades yet.</p>
        ) : (
          <ul className="space-y-1">
            {recentClosed.map((entry) => {
              const profit = getEntryProfit(entry) ?? 0
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-2 text-xs px-1"
                >
                  <span className="text-zinc-400 tabular-nums truncate">
                    {entry.closeDate || entry.entryDate} · {instrumentLabel(entry.instrumentType)}
                  </span>
                  <span
                    className={`font-semibold tabular-nums shrink-0 ${
                      profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-red-400' : 'text-zinc-400'
                    }`}
                  >
                    {formatMoney(profit)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
