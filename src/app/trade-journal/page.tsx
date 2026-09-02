'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, GripVertical } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/lib/auth-store'
import {
  TradeJournalEntry,
  MonthlyProfitEntry,
  SacrificePoolEntry,
  InstrumentType,
  INSTRUMENT_OPTIONS,
  calcMonthlyProfitSummaries,
  calcOpenPositionSummary,
  calcPointPnL,
  calcSacrificePoolTotals,
  createSacrificePoolEntry,
  defaultProfitMonthOnClose,
  ensureMonthsInSummaries,
  getContributeRecipientTargets,
  getCurrentMonthKey,
  getSacrificePoolPoints,
  type OpenPositionSummary,
  applyRollOverDiff,
  createEmptyEntry,
  createMonthlyProfitEntry,
  getEntryProfit,
  isOpenPosition,
  normalizeEntry,
  getTradeNumber,
  isShortPosition,
  renumberEntries,
  sortEntriesByEntryDate,
  withRecalculatedProfit,
  type TradeJournalData,
} from '@/lib/trade-journal-types'
import { loadTradeJournal, saveTradeJournal } from '@/lib/trade-journal-storage'
import { fetchTradeJournalReason } from '@/lib/trade-journal-reason'
import { type TradeStationPositionLine } from '@/lib/tradestation-map'
import {
  createJournalEntryFromFill,
  exitPriceFromFill,
  getContributeCloseTargets,
  getJournalTargetsForFillAction,
  getUsedTradeStationFillIds,
  loadDismissedTsFillIds,
  saveDismissedTsFillIds,
  TS_FILL_DRAG_TYPE,
  TradeStationRecentFill,
  type TsFillJournalAction,
} from '@/lib/tradestation-recent-fills'
import { fetchAuthSession } from 'aws-amplify/auth'

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatNumber(value: number | null): string {
  return value == null ? '' : String(value)
}

const PROFIT_FIELDS = new Set(['buyPrice', 'soldPrice', 'instrumentType', 'positionSize'])

const PRICE_COL = 'w-[10ch] min-w-[10ch] max-w-[10ch] px-1'
const PRICE_INPUT =
  'w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-1 py-1.5 text-xs tabular-nums text-white'

const UNDO_STACK_LIMIT = 50

export default function TradeJournalPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [entries, setEntries] = useState<TradeJournalEntry[]>([])
  const [monthlyProfitEntries, setMonthlyProfitEntries] = useState<MonthlyProfitEntry[]>([])
  const [sacrificePoolEntries, setSacrificePoolEntries] = useState<SacrificePoolEntry[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [tsConnected, setTsConnected] = useState(false)
  const [tsLoading, setTsLoading] = useState(false)
  const [tsLoadingFills, setTsLoadingFills] = useState(false)
  const [tsRecentFills, setTsRecentFills] = useState<TradeStationRecentFill[]>([])
  const [tsDropTarget, setTsDropTarget] = useState<{ entryId: string; field: 'buy' | 'sold' } | null>(
    null
  )
  const [tsMessage, setTsMessage] = useState<string | null>(null)
  const [tsAccounts, setTsAccounts] = useState<{ id: string; type?: string; alias?: string }[]>([])
  const [dismissedTsFillIds, setDismissedTsFillIds] = useState<Set<string>>(new Set())
  const [tsFillActionMenu, setTsFillActionMenu] = useState<{
    fillId: string
    action: TsFillJournalAction
    contributeSourceId?: string
  } | null>(null)
  const [tsPositionSummary, setTsPositionSummary] = useState<OpenPositionSummary | null>(null)
  const [tsPositionLines, setTsPositionLines] = useState<TradeStationPositionLine[]>([])
  const [tsLoadingPositions, setTsLoadingPositions] = useState(false)
  const [entryDateSort, setEntryDateSort] = useState<'asc' | 'desc' | null>('desc')
  const [addingEntry, setAddingEntry] = useState(false)
  const [rollOverDiffInput, setRollOverDiffInput] = useState('')
  const [undoCount, setUndoCount] = useState(0)
  const undoStackRef = useRef<TradeJournalData[]>([])

  const pushUndoSnapshot = useCallback(() => {
    undoStackRef.current.push({
      entries: JSON.parse(JSON.stringify(entries)) as TradeJournalEntry[],
      monthlyProfitEntries: JSON.parse(JSON.stringify(monthlyProfitEntries)),
      sacrificePoolEntries: JSON.parse(JSON.stringify(sacrificePoolEntries)),
    })
    if (undoStackRef.current.length > UNDO_STACK_LIMIT) {
      undoStackRef.current.shift()
    }
    setUndoCount(undoStackRef.current.length)
  }, [entries, monthlyProfitEntries, sacrificePoolEntries])

  const undoLastAction = useCallback(() => {
    const snapshot = undoStackRef.current.pop()
    if (!snapshot) return
    setEntries(snapshot.entries)
    setMonthlyProfitEntries(snapshot.monthlyProfitEntries)
    setSacrificePoolEntries(snapshot.sacrificePoolEntries ?? [])
    setUndoCount(undoStackRef.current.length)
    setTsMessage('Undid last action.')
  }, [])

  const openPositionCount = useMemo(
    () => entries.filter((entry) => isOpenPosition(entry)).length,
    [entries]
  )

  const usedTsFillIds = useMemo(() => getUsedTradeStationFillIds(entries), [entries])

  const visibleTsFills = useMemo(
    () => tsRecentFills.filter((fill) => !dismissedTsFillIds.has(fill.id)),
    [tsRecentFills, dismissedTsFillIds]
  )

  const dismissedTsFillCount = useMemo(
    () => tsRecentFills.filter((fill) => dismissedTsFillIds.has(fill.id)).length,
    [tsRecentFills, dismissedTsFillIds]
  )

  useEffect(() => {
    if (!isLoaded) return
    setDismissedTsFillIds(loadDismissedTsFillIds(user?.userId))
  }, [isLoaded, user?.userId])

  useEffect(() => {
    if (!tsFillActionMenu) return

    const isInsideTsFillMenu = (event: MouseEvent) => {
      const nodes: EventTarget[] =
        typeof event.composedPath === 'function'
          ? event.composedPath()
          : event.target != null
            ? [event.target]
            : []
      return nodes.some(
        (node) => node instanceof Element && node.closest('[data-ts-fill-menu]') != null
      )
    }

    const close = (event: MouseEvent) => {
      if (isInsideTsFillMenu(event)) return
      setTsFillActionMenu(null)
    }

    const timeoutId = window.setTimeout(() => {
      document.addEventListener('mousedown', close)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('mousedown', close)
    }
  }, [tsFillActionMenu])

  async function authHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken?.toString()
    if (idToken) headers.Authorization = `Bearer ${idToken}`
    return headers
  }

  const refreshTradeStationStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setTsConnected(false)
      setTsAccounts([])
      return
    }
    setTsLoading(true)
    try {
      const response = await fetch('/api/tradestation/status', {
        headers: await authHeaders(),
        credentials: 'include',
        cache: 'no-store',
      })
      if (!response.ok) {
        setTsConnected(false)
        return
      }
      const data = (await response.json()) as {
        connected?: boolean
        accounts?: { id: string; type?: string; alias?: string }[]
      }
      setTsConnected(Boolean(data.connected))
      setTsAccounts(data.accounts ?? [])
    } catch {
      setTsConnected(false)
    } finally {
      setTsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const loaded = await loadTradeJournal(user?.userId)
      if (!cancelled) {
        setEntries(
          renumberEntries(loaded.entries.map((entry, index) => normalizeEntry(entry, index)))
        )
        setMonthlyProfitEntries(loaded.monthlyProfitEntries)
        setSacrificePoolEntries(loaded.sacrificePoolEntries ?? [])
        undoStackRef.current = []
        setUndoCount(0)
        setIsLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.userId])

  useEffect(() => {
    if (!isLoaded) return
    void refreshTradeStationStatus()
  }, [isLoaded, refreshTradeStationStatus])

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ts = params.get('ts')
    if (!ts) return

    if (ts === 'connected') setTsMessage('TradeStation connected.')
    else if (ts === 'denied') setTsMessage('TradeStation authorization was declined.')
    else setTsMessage('TradeStation connection failed. Check callback URL settings.')

    params.delete('ts')
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
    window.history.replaceState({}, '', next)
    void refreshTradeStationStatus()
  }, [isLoaded, refreshTradeStationStatus])

  useEffect(() => {
    if (!isLoaded) return

    setIsSaving(true)
    const timer = window.setTimeout(async () => {
      await saveTradeJournal({ entries, monthlyProfitEntries, sacrificePoolEntries }, user?.userId)
      setLastSavedAt(new Date().toLocaleTimeString())
      setIsSaving(false)
    }, 600)

    return () => window.clearTimeout(timer)
  }, [entries, monthlyProfitEntries, sacrificePoolEntries, isLoaded, user?.userId])

  const totalProfit = useMemo(() => {
    const tradeTotal = entries.reduce((sum, entry) => sum + (getEntryProfit(entry) ?? 0), 0)
    const manualTotal = monthlyProfitEntries.reduce((sum, line) => sum + line.amount, 0)
    return tradeTotal + manualTotal
  }, [entries, monthlyProfitEntries])

  const displayEntries = useMemo(() => {
    if (!entryDateSort) return entries
    return sortEntriesByEntryDate(entries, entryDateSort)
  }, [entries, entryDateSort])

  const positionSummary = useMemo(() => calcOpenPositionSummary(entries), [entries])
  const positionsNetMatch = useMemo(() => {
    if (!tsPositionSummary) return null
    return tsPositionSummary.netPosition === positionSummary.netPosition
  }, [tsPositionSummary, positionSummary])
  const monthlySummaries = useMemo(() => {
    const currentMonthKey = getCurrentMonthKey()
    const summaries = calcMonthlyProfitSummaries(entries, monthlyProfitEntries)
    return ensureMonthsInSummaries(summaries, [currentMonthKey])
  }, [entries, monthlyProfitEntries])

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), [])

  const sacrificePoolTotals = useMemo(
    () => calcSacrificePoolTotals(sacrificePoolEntries),
    [sacrificePoolEntries]
  )

  const sortedSacrificePoolEntries = useMemo(
    () => [...sacrificePoolEntries].sort((a, b) => b.date.localeCompare(a.date)),
    [sacrificePoolEntries]
  )

  const removeSacrificePoolEntry = (id: string) => {
    pushUndoSnapshot()
    setSacrificePoolEntries((prev) => prev.filter((line) => line.id !== id))
    setTsMessage('Removed parked-pool lot.')
  }

  const addMonthlyProfitEntry = () => {
    pushUndoSnapshot()
    setMonthlyProfitEntries((prev) => [...prev, createMonthlyProfitEntry()])
  }

  const updateMonthlyProfitEntry = (id: string, patch: Partial<MonthlyProfitEntry>) => {
    setMonthlyProfitEntries((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line))
    )
  }

  const removeMonthlyProfitEntry = (id: string) => {
    pushUndoSnapshot()
    setMonthlyProfitEntries((prev) => prev.filter((line) => line.id !== id))
  }

  const updateEntry = useCallback((id: string, patch: Partial<TradeJournalEntry>) => {
    setEntries((prev) =>
      renumberEntries(
        prev.map((entry) => {
          if (entry.id !== id) return entry
          const next = { ...entry, ...patch }
          if (Object.keys(patch).some((key) => PROFIT_FIELDS.has(key))) {
            return withRecalculatedProfit(next)
          }
          return next
        })
      )
    )
  }, [])

  const addEntry = async () => {
    setAddingEntry(true)
    try {
      pushUndoSnapshot()
      const entry = createEmptyEntry(entries.length + 1)
      const reason = await fetchTradeJournalReason(entry.entryDate)
      setEntries((prev) =>
        renumberEntries([...prev, reason ? { ...entry, reason } : entry])
      )
    } finally {
      setAddingEntry(false)
    }
  }

  const removeEntry = (id: string) => {
    pushUndoSnapshot()
    setEntries((prev) => renumberEntries(prev.filter((entry) => entry.id !== id)))
  }

  const moveEntry = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return
      pushUndoSnapshot()
      setEntries((prev) => {
        const fromIndex = prev.findIndex((entry) => entry.id === fromId)
        const toIndex = prev.findIndex((entry) => entry.id === toId)
        if (fromIndex < 0 || toIndex < 0) return prev
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        return renumberEntries(next)
      })
    },
    [pushUndoSnapshot]
  )

  const applyRollOver = () => {
    const rollDiff = parseNumber(rollOverDiffInput)
    if (rollDiff == null || rollDiff === 0) {
      setTsMessage('Enter a non-zero roll over difference.')
      return
    }
    if (openPositionCount === 0) {
      setTsMessage('No open positions to roll over.')
      return
    }
    pushUndoSnapshot()
    setEntries((prev) => applyRollOverDiff(prev, rollDiff))
    setTsMessage(
      `Rolled ${openPositionCount} open position(s): long +${rollDiff}, short −${rollDiff} on Buy.`
    )
  }

  const clearDragState = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const connectTradeStation = () => {
    window.location.href = '/api/tradestation/connect'
  }

  const disconnectTradeStation = async () => {
    setTsLoading(true)
    try {
      await fetch('/api/tradestation/disconnect', {
        method: 'POST',
        headers: await authHeaders(),
        credentials: 'include',
      })
      setTsConnected(false)
      setTsAccounts([])
      setTsPositionSummary(null)
      setTsPositionLines([])
      setTsMessage('TradeStation disconnected.')
    } finally {
      setTsLoading(false)
    }
  }

  const loadTradeStationPositions = useCallback(async () => {
    if (!isAuthenticated) return
    setTsLoadingPositions(true)
    try {
      const response = await fetch('/api/tradestation/positions', {
        headers: await authHeaders(),
        credentials: 'include',
        cache: 'no-store',
      })
      const data = (await response.json()) as {
        error?: string
        summary?: OpenPositionSummary & { lines?: TradeStationPositionLine[] }
      }
      if (!response.ok) {
        setTsPositionSummary(null)
        setTsPositionLines([])
        return
      }
      if (!data.summary) {
        setTsPositionSummary(null)
        setTsPositionLines([])
        return
      }
      const { lines = [], highestLong, highestShort, netPosition } = data.summary
      setTsPositionSummary({ highestLong, highestShort, netPosition })
      setTsPositionLines(lines)
    } catch {
      setTsPositionSummary(null)
      setTsPositionLines([])
    } finally {
      setTsLoadingPositions(false)
    }
  }, [isAuthenticated])

  const loadRecentTradeStationFills = useCallback(async () => {
    setTsLoadingFills(true)
    setTsMessage(null)
    try {
      const response = await fetch('/api/tradestation/recent-fills?limit=6&days=14', {
        headers: await authHeaders(),
        credentials: 'include',
        cache: 'no-store',
      })
      const data = (await response.json()) as {
        error?: string
        fills?: TradeStationRecentFill[]
      }
      if (!response.ok) {
        setTsMessage(data.error || 'Failed to load recent fills.')
        return
      }
      setTsRecentFills(data.fills ?? [])
      setTsMessage(`Loaded ${data.fills?.length ?? 0} recent fill(s). Drag onto Buy or Sold.`)
    } catch {
      setTsMessage('Failed to load recent fills.')
    } finally {
      setTsLoadingFills(false)
    }
  }, [])

  useEffect(() => {
    if (tsConnected && isLoaded) {
      void loadRecentTradeStationFills()
      void loadTradeStationPositions()
    }
  }, [tsConnected, isLoaded, loadRecentTradeStationFills, loadTradeStationPositions])

  const applyTsFillToEntry = useCallback(
    async (
      entryId: string,
      field: 'buy' | 'sold',
      fill: TradeStationRecentFill,
      _options?: { takeProfit?: boolean }
    ) => {
      if (field === 'buy') {
        if (fill.buyValue == null) {
          setTsMessage('Close fill — drop on Sold, not Buy.')
          return
        }
        pushUndoSnapshot()
        const openReason = await fetchTradeJournalReason(fill.date)
        const target = entries.find((entry) => entry.id === entryId)
        updateEntry(entryId, {
          buyPrice: fill.buyValue,
          entryDate: fill.date,
          instrumentType: fill.instrumentType,
          positionSize: fill.quantity,
          tradestationBuyFillId: fill.id,
          ...(openReason && !target?.reason ? { reason: openReason } : {}),
        })
        setTsMessage(`Set Buy from ${fill.label}`)
        return
      }

      const soldPrice =
        fill.soldValue ??
        (fill.openOrClose === 'open' && fill.buyOrSell === 'sell' ? fill.price : null)
      if (soldPrice == null) {
        setTsMessage('Open fill — drop on Buy, not Sold.')
        return
      }

      const closeReason = await fetchTradeJournalReason(fill.date)
      const target = entries.find((entry) => entry.id === entryId)
      const profitMonth = defaultProfitMonthOnClose({
        profitMonth: target?.profitMonth ?? null,
        closeDate: fill.date,
      })

      pushUndoSnapshot()
      updateEntry(entryId, {
        soldPrice,
        closeDate: fill.date,
        closeReason: closeReason || null,
        ...(profitMonth ? { profitMonth } : {}),
        instrumentType: fill.instrumentType,
        positionSize: fill.quantity,
        tradestationSoldFillId: fill.id,
      })
      setTsMessage(
        _options?.takeProfit
          ? `Take profit logged on position ${getTradeNumber(entries, entryId) ?? '—'}`
          : `Set Sold from ${fill.label}`
      )
    },
    [entries, updateEntry, pushUndoSnapshot]
  )

  const instrumentShortLabel = useCallback((type: InstrumentType) => {
    return INSTRUMENT_OPTIONS.find((o) => o.value === type)?.shortLabel ?? type
  }, [])

  /**
   * Close an open position at the fill price and park its point P&L (a loss) in the
   * per-instrument Sacrifice pool instead of booking it to monthly P&L.
   */
  const applySacrificeFill = useCallback(
    async (sourceEntryId: string, fill: TradeStationRecentFill) => {
      const source = entries.find((entry) => entry.id === sourceEntryId)
      if (!source?.buyPrice) {
        setTsMessage('Position has no Buy price to sacrifice.')
        return
      }

      const exitPrice = exitPriceFromFill(fill)
      const points = calcPointPnL(source.buyPrice, exitPrice)
      if (points == null) {
        setTsMessage('Cannot compute points for this close.')
        return
      }

      const sourceNo = getTradeNumber(entries, sourceEntryId)
      const label = instrumentShortLabel(fill.instrumentType)
      const closeReasonBase = await fetchTradeJournalReason(fill.date)
      const note = `Sacrifice ${points > 0 ? '+' : ''}${points}pts → ${label} pool`
      const closeReason = closeReasonBase ? `${closeReasonBase} · ${note}` : note

      pushUndoSnapshot()
      setEntries((prev) =>
        renumberEntries(
          prev.map((entry) => {
            if (entry.id !== sourceEntryId) return entry
            return withRecalculatedProfit({
              ...entry,
              soldPrice: exitPrice,
              closeDate: fill.date,
              closeReason,
              pointsSacrificed: points,
              instrumentType: fill.instrumentType,
              positionSize: fill.quantity,
              tradestationSoldFillId: fill.id,
              profit: 0,
            })
          })
        )
      )
      setSacrificePoolEntries((prev) => [
        ...prev,
        createSacrificePoolEntry({
          instrumentType: fill.instrumentType,
          points,
          date: fill.date,
          note: `#${sourceNo ?? '—'} sacrificed @ ${exitPrice}`,
          kind: 'sacrifice',
          sourceEntryId,
        }),
      ])
      setTsFillActionMenu(null)
      setTsMessage(
        `Sacrificed ${points > 0 ? '+' : ''}${points} pts from #${sourceNo ?? '—'} into the ${label} parked pool.`
      )
    },
    [entries, instrumentShortLabel, pushUndoSnapshot]
  )

  /**
   * Close an open position and route its point P&L (a profit) into the per-instrument
   * Sacrifice pool — e.g. pool −1000 + 100 profit → −900.
   */
  const applyContributeToPool = useCallback(
    async (fill: TradeStationRecentFill, sourceEntryId: string) => {
      const source = entries.find((entry) => entry.id === sourceEntryId)
      if (!source?.buyPrice) {
        setTsMessage('Source position has no Buy price.')
        return
      }

      const exitPrice = exitPriceFromFill(fill)
      const points = calcPointPnL(source.buyPrice, exitPrice)
      if (points == null || points === 0) {
        setTsMessage('No point P&L to contribute from this close.')
        return
      }

      const sourceNo = getTradeNumber(entries, sourceEntryId)
      const label = instrumentShortLabel(fill.instrumentType)
      const closeReasonBase = await fetchTradeJournalReason(fill.date)
      const note = `Contrib ${points > 0 ? '+' : ''}${points}pts → ${label} pool`
      const closeReason = closeReasonBase ? `${closeReasonBase} · ${note}` : note

      pushUndoSnapshot()
      setEntries((prev) =>
        renumberEntries(
          prev.map((entry) => {
            if (entry.id !== sourceEntryId) return entry
            const profitMonth = defaultProfitMonthOnClose({
              profitMonth: entry.profitMonth,
              closeDate: fill.date,
            })
            return withRecalculatedProfit({
              ...entry,
              soldPrice: exitPrice,
              closeDate: fill.date,
              closeReason,
              ...(profitMonth ? { profitMonth } : {}),
              pointsContributed: points,
              contributedToEntryId: null,
              instrumentType: fill.instrumentType,
              positionSize: fill.quantity,
              tradestationSoldFillId: fill.id,
              profit: 0,
            })
          })
        )
      )
      setSacrificePoolEntries((prev) => [
        ...prev,
        createSacrificePoolEntry({
          instrumentType: fill.instrumentType,
          points,
          date: fill.date,
          note: `#${sourceNo ?? '—'} contributed @ ${exitPrice}`,
          kind: 'contribution',
          sourceEntryId,
        }),
      ])
      setTsFillActionMenu(null)
      setTsMessage(
        `Contributed ${points > 0 ? '+' : ''}${points} pts from #${sourceNo ?? '—'} to the ${label} parked pool.`
      )
    },
    [entries, instrumentShortLabel, pushUndoSnapshot]
  )

  const applyTsFillFromMenu = useCallback(
    (entryId: string, fill: TradeStationRecentFill, action: TsFillJournalAction) => {
      setTsFillActionMenu(null)
      if (action === 'buy') {
        void applyTsFillToEntry(entryId, 'buy', fill)
        return
      }
      if (action === 'sacrifice') {
        void applySacrificeFill(entryId, fill)
        return
      }
      if (action === 'sell') {
        void applyTsFillToEntry(entryId, 'sold', fill, { takeProfit: true })
        return
      }
      void applyTsFillToEntry(
        entryId,
        'sold',
        fill,
        { takeProfit: action === 'takeProfit' }
      )
    },
    [applyTsFillToEntry, applySacrificeFill]
  )

  const toggleTsFillActionMenu = useCallback(
    (fillId: string, action: TsFillJournalAction) => {
      setTsFillActionMenu((prev) => {
        if (prev?.fillId === fillId && prev.action === action && !prev.contributeSourceId) {
          return null
        }
        return { fillId, action }
      })
    },
    []
  )

  const applyContributeFill = useCallback(
    async (
      fill: TradeStationRecentFill,
      sourceEntryId: string,
      recipientEntryId: string
    ) => {
      const source = entries.find((entry) => entry.id === sourceEntryId)
      if (!source?.buyPrice) {
        setTsMessage('Source position has no Buy price.')
        return
      }

      const exitPrice = exitPriceFromFill(fill)
      const points = calcPointPnL(source.buyPrice, exitPrice)
      if (points == null || points === 0) {
        setTsMessage('No point P&L to contribute from this close.')
        return
      }

      const recipient = entries.find((entry) => entry.id === recipientEntryId)
      if (!recipient || !isOpenPosition(recipient)) {
        setTsMessage('Recipient position is not open.')
        return
      }

      const recipientNo = getTradeNumber(entries, recipientEntryId)
      const closeReasonBase = await fetchTradeJournalReason(fill.date)
      const contribNote = `Contrib ${points > 0 ? '+' : ''}${points}pts → #${recipientNo ?? '—'}`
      const closeReason = closeReasonBase
        ? `${closeReasonBase} · ${contribNote}`
        : contribNote

      pushUndoSnapshot()
      setEntries((prev) =>
        renumberEntries(
          prev.map((entry) => {
            if (entry.id === sourceEntryId) {
              const profitMonth = defaultProfitMonthOnClose({
                profitMonth: entry.profitMonth,
                closeDate: fill.date,
              })
              return withRecalculatedProfit({
                ...entry,
                soldPrice: exitPrice,
                closeDate: fill.date,
                closeReason,
                ...(profitMonth ? { profitMonth } : {}),
                pointsContributed: points,
                contributedToEntryId: recipientEntryId,
                instrumentType: fill.instrumentType,
                positionSize: fill.quantity,
                tradestationSoldFillId: fill.id,
                profit: 0,
              })
            }
            if (entry.id === recipientEntryId && entry.buyPrice != null) {
              return withRecalculatedProfit({
                ...entry,
                buyPrice: entry.buyPrice - points,
              })
            }
            return entry
          })
        )
      )
      setTsFillActionMenu(null)
      setTsMessage(
        `Contributed ${points > 0 ? '+' : ''}${points} pts from #${getTradeNumber(entries, sourceEntryId) ?? '—'} to #${recipientNo ?? '—'}.`
      )
    },
    [entries, pushUndoSnapshot]
  )

  const addFillAsJournalEntry = useCallback(async (fill: TradeStationRecentFill) => {
    pushUndoSnapshot()
    const modelReason = await fetchTradeJournalReason(fill.date)
    const base = createJournalEntryFromFill(fill)
    const isOpen = fill.openOrClose === 'open'
    const entry = withRecalculatedProfit({
      ...base,
      reason: isOpen ? modelReason || base.reason : base.reason,
      closeReason: isOpen ? null : modelReason || base.closeReason,
    })
    setEntries((prev) => renumberEntries([entry, ...prev]))
    setTsMessage(`Added new row: ${fill.label}`)
  }, [pushUndoSnapshot])

  const removeTsFillFromList = useCallback(
    (fillId: string) => {
      setDismissedTsFillIds((prev) => {
        const next = new Set(prev).add(fillId)
        saveDismissedTsFillIds(next, user?.userId)
        return next
      })
      setTsMessage('Removed fill from recent list.')
    },
    [user?.userId]
  )

  const restoreRemovedTsFills = useCallback(() => {
    setDismissedTsFillIds(new Set())
    saveDismissedTsFillIds(new Set(), user?.userId)
    setTsMessage('Restored removed fills.')
  }, [user?.userId])

  const handleTsFillDrop = useCallback(
    (entryId: string, field: 'buy' | 'sold', e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setTsDropTarget(null)
      const raw = e.dataTransfer.getData(TS_FILL_DRAG_TYPE)
      if (!raw) return
      try {
        const fill = JSON.parse(raw) as TradeStationRecentFill
        void applyTsFillToEntry(entryId, field, fill, {
          takeProfit: field === 'sold',
        })
      } catch {
        setTsMessage('Could not read dropped fill.')
      }
    },
    [applyTsFillToEntry]
  )

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20" />

      <div className="relative mx-auto max-w-7xl p-4 pb-12 sm:p-6 sm:pb-16">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Trade Journal
          </h1>
          <p className="text-gray-300">
            Buy: positive = long, negative = short. Position clears when sold. Closed trades count
            in the close month (July closes → July). Override with P&L Month, or add manual month
            profit for carry-over/adjustments.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span>
              Storage:{' '}
              {isAuthenticated
                ? 'DynamoDB (signed in) + local backup'
                : 'Browser local backup only — sign in to sync'}
            </span>
            <span className="text-emerald-400">
              Total P&L: {totalProfit >= 0 ? '+' : ''}
              {totalProfit.toFixed(2)}
            </span>
            <span>{isSaving ? 'Saving…' : lastSavedAt ? `Saved ${lastSavedAt}` : 'Ready'}</span>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-700/80 bg-zinc-900/50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">TradeStation</h3>
                <p className="text-xs text-gray-400">
                  {tsConnected
                    ? `Connected${tsAccounts[0]?.alias ? ` · ${tsAccounts[0].alias}` : ''}`
                    : 'Connect to load recent fills and compare net position'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!tsConnected ? (
                  <button
                    type="button"
                    onClick={connectTradeStation}
                    disabled={!isAuthenticated || tsLoading}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {tsLoading ? 'Checking…' : 'Connect TradeStation'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await loadRecentTradeStationFills()
                        await loadTradeStationPositions()
                      }}
                      disabled={tsLoadingFills}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {tsLoadingFills ? 'Loading…' : 'Refresh recent fills'}
                    </button>
                    <button
                      type="button"
                      onClick={disconnectTradeStation}
                      disabled={tsLoading}
                      className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-gray-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>
            {!isAuthenticated && (
              <p className="mt-2 text-xs text-amber-400">Sign in to Predixa to connect TradeStation.</p>
            )}
            {tsMessage && <p className="mt-2 text-xs text-gray-300">{tsMessage}</p>}

            {tsConnected && (
              <div className="mt-3 rounded-lg border border-zinc-700/60 bg-zinc-950/80 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-300">
                    Drag onto journal <strong>Buy</strong> or <strong>Sold</strong>, use dropdowns on each
                    action, or <strong>Take profit</strong> / <strong>Contribute</strong> to close an open
                    position.
                  </p>
                  {dismissedTsFillCount > 0 && (
                    <button
                      type="button"
                      onClick={restoreRemovedTsFills}
                      className="text-xs text-blue-300 hover:text-blue-200"
                    >
                      Restore removed ({dismissedTsFillCount})
                    </button>
                  )}
                </div>
                {visibleTsFills.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    {tsRecentFills.length === 0
                      ? 'No fills loaded. Click Refresh recent fills.'
                      : 'All fills were removed. Click Restore removed above.'}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {visibleTsFills.map((fill) => {
                      const inJournal = usedTsFillIds.has(fill.id)
                      const isCloseFill = fill.openOrClose === 'close'
                      const isLongOpen = fill.openOrClose === 'open' && fill.buyOrSell === 'buy'
                      const isShortOpen = fill.openOrClose === 'open' && fill.buyOrSell === 'sell'

                      const renderFillActionMenu = (
                        action: TsFillJournalAction,
                        label: string,
                        className: string
                      ) => {
                        const isOpen =
                          tsFillActionMenu?.fillId === fill.id &&
                          tsFillActionMenu.action === action
                        const targets = getJournalTargetsForFillAction(fill, entries, action)

                        return (
                          <div
                            data-ts-fill-menu
                            className="relative shrink-0"
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onDragStart={(e) => e.preventDefault()}
                          >
                            <button
                              type="button"
                              onClick={() => toggleTsFillActionMenu(fill.id, action)}
                              disabled={inJournal}
                              title={`Pick a journal row for ${label}`}
                              className={clsx(
                                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-40',
                                className
                              )}
                            >
                              {label}
                              <ChevronDown
                                className={clsx('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
                              />
                            </button>
                            {isOpen && (
                              <ul
                                data-ts-fill-menu
                                className="absolute right-0 top-full z-30 mt-1 max-h-48 min-w-[15rem] overflow-y-auto overscroll-contain rounded-md border border-zinc-600 bg-zinc-900 py-1 shadow-lg [scrollbar-gutter:stable]"
                              >
                                {targets.length === 0 ? (
                                  <li className="px-3 py-2 text-[10px] text-gray-500">
                                    {action === 'buy'
                                      ? 'No empty Buy rows for this instrument.'
                                      : 'No matching open positions.'}
                                  </li>
                                ) : (
                                  targets.map(({ entry, tradeNo, projectedProfit }) => (
                                    <li key={entry.id}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          applyTsFillFromMenu(entry.id, fill, action)
                                        }
                                        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-zinc-800"
                                      >
                                        <span className="text-[10px] font-medium text-white">
                                          {tradeNo != null ? (
                                            <span
                                              className={
                                                tradeNo < 0 ? 'text-red-400' : 'text-emerald-400'
                                              }
                                            >
                                              #{tradeNo}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">Row</span>
                                          )}
                                          {' · '}
                                          <span className="text-gray-300">{entry.entryDate}</span>
                                          {entry.buyPrice != null && (
                                            <>
                                              {' · '}
                                              <span className="tabular-nums text-gray-400">
                                                Buy {entry.buyPrice}
                                              </span>
                                            </>
                                          )}
                                        </span>
                                        {projectedProfit != null && (
                                          <span
                                            className={clsx(
                                              'text-[10px] tabular-nums',
                                              projectedProfit >= 0
                                                ? 'text-emerald-400'
                                                : 'text-red-400'
                                            )}
                                          >
                                            P&L {projectedProfit >= 0 ? '+' : ''}
                                            {projectedProfit.toFixed(2)}
                                          </span>
                                        )}
                                      </button>
                                    </li>
                                  ))
                                )}
                              </ul>
                            )}
                          </div>
                        )
                      }

                      const renderContributeMenu = () => {
                        if (!isCloseFill && !isShortOpen) return null

                        const isOpen =
                          tsFillActionMenu?.fillId === fill.id &&
                          tsFillActionMenu?.action === 'contribute'
                        const sourceId = isOpen ? tsFillActionMenu?.contributeSourceId : undefined
                        const exitPrice = exitPriceFromFill(fill)
                        const sourceEntry = sourceId
                          ? entries.find((entry) => entry.id === sourceId)
                          : undefined
                        const points =
                          sourceEntry?.buyPrice != null
                            ? calcPointPnL(sourceEntry.buyPrice, exitPrice)
                            : null
                        const closeTargets = !sourceId
                          ? getContributeCloseTargets(fill, entries)
                          : []
                        const recipientTargets =
                          sourceId && points != null
                            ? getContributeRecipientTargets(
                                entries,
                                sourceId,
                                points,
                                fill.instrumentType
                              )
                            : []

                        return (
                          <div
                            data-ts-fill-menu
                            className="relative shrink-0"
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onDragStart={(e) => e.preventDefault()}
                          >
                            <button
                              type="button"
                              onClick={() => toggleTsFillActionMenu(fill.id, 'contribute')}
                              disabled={inJournal}
                              title="Close a position and add points to another open entry"
                              className="inline-flex items-center gap-0.5 rounded border border-purple-500/40 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Contribute
                              <ChevronDown
                                className={clsx(
                                  'h-3 w-3 transition-transform',
                                  isOpen && 'rotate-180'
                                )}
                              />
                            </button>
                            {isOpen && (
                              <ul
                                data-ts-fill-menu
                                className="absolute right-0 top-full z-30 mt-1 max-h-48 min-w-[16rem] overflow-y-auto overscroll-contain rounded-md border border-zinc-600 bg-zinc-900 py-1 shadow-lg [scrollbar-gutter:stable]"
                              >
                                {sourceId ? (
                                  <>
                                    <li className="border-b border-zinc-700/80 px-3 py-1.5 text-[10px] text-purple-300">
                                      {points != null ? (
                                        <>
                                          {points > 0 ? '+' : ''}
                                          {points} pts from #
                                          {getTradeNumber(entries, sourceId) ?? '—'} → pick recipient
                                        </>
                                      ) : (
                                        'No points to contribute'
                                      )}
                                    </li>
                                    {points != null && points !== 0 && (
                                      <li>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void applyContributeToPool(fill, sourceId)
                                          }
                                          className="flex w-full flex-col gap-0.5 border-b border-zinc-700/60 px-3 py-2 text-left hover:bg-zinc-800"
                                        >
                                          <span className="text-[10px] font-medium text-orange-200">
                                            → {instrumentShortLabel(fill.instrumentType)} parked pool
                                          </span>
                                          <span className="text-[10px] tabular-nums text-orange-300">
                                            {(() => {
                                              const cur = getSacrificePoolPoints(
                                                sacrificePoolEntries,
                                                fill.instrumentType
                                              )
                                              const next = cur + points
                                              return `${cur > 0 ? '+' : ''}${cur} → ${next > 0 ? '+' : ''}${next}`
                                            })()}
                                          </span>
                                        </button>
                                      </li>
                                    )}
                                    {recipientTargets.length === 0 ? (
                                      <li className="px-3 py-2 text-[10px] text-gray-500">
                                        No other open positions — contribute to the pool above.
                                      </li>
                                    ) : (
                                      recipientTargets.map(
                                        ({ entry, tradeNo, newBuyPrice }) => (
                                          <li key={entry.id}>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void applyContributeFill(
                                                  fill,
                                                  sourceId,
                                                  entry.id
                                                )
                                              }
                                              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-zinc-800"
                                            >
                                              <span className="text-[10px] font-medium text-white">
                                                {tradeNo != null ? (
                                                  <span
                                                    className={
                                                      tradeNo < 0
                                                        ? 'text-red-400'
                                                        : 'text-emerald-400'
                                                    }
                                                  >
                                                    #{tradeNo}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400">Row</span>
                                                )}
                                                {' · '}
                                                <span className="text-gray-300">
                                                  {entry.entryDate}
                                                </span>
                                              </span>
                                              <span className="text-[10px] tabular-nums text-purple-300">
                                                Buy {entry.buyPrice} → {newBuyPrice}
                                              </span>
                                            </button>
                                          </li>
                                        )
                                      )
                                    )}
                                    <li className="border-t border-zinc-700/80">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setTsFillActionMenu({
                                            fillId: fill.id,
                                            action: 'contribute',
                                          })
                                        }
                                        className="w-full px-3 py-1.5 text-left text-[10px] text-gray-400 hover:bg-zinc-800"
                                      >
                                        ← Back
                                      </button>
                                    </li>
                                  </>
                                ) : closeTargets.length === 0 ? (
                                  <li className="px-3 py-2 text-[10px] text-gray-500">
                                    No matching open positions to close.
                                  </li>
                                ) : (
                                  closeTargets.map(({ entry, tradeNo, projectedProfit }) => (
                                    <li key={entry.id}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setTsFillActionMenu({
                                            fillId: fill.id,
                                            action: 'contribute',
                                            contributeSourceId: entry.id,
                                          })
                                        }
                                        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-zinc-800"
                                      >
                                        <span className="text-[10px] font-medium text-white">
                                          Close{' '}
                                          {tradeNo != null ? (
                                            <span
                                              className={
                                                tradeNo < 0 ? 'text-red-400' : 'text-emerald-400'
                                              }
                                            >
                                              #{tradeNo}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">row</span>
                                          )}
                                          {' · '}
                                          <span className="text-gray-300">{entry.entryDate}</span>
                                          {entry.buyPrice != null && (
                                            <>
                                              {' · '}
                                              <span className="tabular-nums text-gray-400">
                                                Buy {entry.buyPrice}
                                              </span>
                                            </>
                                          )}
                                        </span>
                                        {projectedProfit != null && (
                                          <span className="text-[10px] tabular-nums text-gray-500">
                                            {calcPointPnL(entry.buyPrice, exitPrice) ?? 0} pts to
                                            contribute
                                          </span>
                                        )}
                                      </button>
                                    </li>
                                  ))
                                )}
                              </ul>
                            )}
                          </div>
                        )
                      }

                      return (
                        <li
                          key={fill.id}
                          draggable={!inJournal && !tsFillActionMenu}
                          onDragStart={(e) => {
                            if (inJournal || tsFillActionMenu) return
                            e.dataTransfer.setData(TS_FILL_DRAG_TYPE, JSON.stringify(fill))
                            e.dataTransfer.effectAllowed = 'copy'
                          }}
                          className={clsx(
                            'flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs',
                            inJournal
                              ? 'border-zinc-800/80 bg-zinc-900/40 opacity-70'
                              : 'cursor-grab border-zinc-700/80 bg-zinc-900/80 active:cursor-grabbing'
                          )}
                        >
                          <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                          <span className="shrink-0 tabular-nums text-gray-500">
                            {fill.date} {fill.time}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-white">{fill.label}</span>
                          {isLongOpen &&
                            renderFillActionMenu('buy', '→ Buy', 'bg-emerald-500/20 text-emerald-400')}
                          {isShortOpen &&
                            renderFillActionMenu('sell', '→ Sell', 'bg-red-500/20 text-red-400')}
                          {(isLongOpen || isShortOpen) &&
                            !inJournal &&
                            renderFillActionMenu(
                              'sacrifice',
                              'Sacrifice',
                              'border border-orange-500/40 bg-orange-500/10 text-orange-300'
                            )}
                          {isShortOpen && !inJournal && renderContributeMenu()}
                          {isCloseFill &&
                            renderFillActionMenu('sold', '→ Sold', 'bg-amber-500/20 text-amber-300')}
                          {inJournal ? (
                            <span className="shrink-0 rounded bg-zinc-700/60 px-2 py-0.5 text-[10px] text-gray-400">
                              In journal
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => void addFillAsJournalEntry(fill)}
                                className="shrink-0 rounded border border-zinc-600 px-2 py-0.5 text-[10px] font-medium text-blue-300 hover:border-blue-500/50 hover:bg-blue-500/10"
                              >
                                Add row
                              </button>
                              {isCloseFill &&
                                renderFillActionMenu(
                                  'takeProfit',
                                  'Take profit',
                                  'border border-amber-500/40 bg-amber-500/10 text-amber-200'
                                )}
                              {isCloseFill &&
                                renderFillActionMenu(
                                  'sacrifice',
                                  'Sacrifice',
                                  'border border-orange-500/40 bg-orange-500/10 text-orange-300'
                                )}
                              {isCloseFill && renderContributeMenu()}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => removeTsFillFromList(fill.id)}
                            title="Hide from recent fills list"
                            className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-red-400 hover:bg-red-500/10"
                          >
                            Remove
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/70 backdrop-blur-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <h2 className="text-lg font-semibold text-white">Trades</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-400">
                Roll diff
                <input
                  type="number"
                  step="0.25"
                  value={rollOverDiffInput}
                  onChange={(e) => setRollOverDiffInput(e.target.value)}
                  placeholder="±pts"
                  title="Futures roll spread: added to long Buy, subtracted from short Buy"
                  className="w-[7ch] rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs tabular-nums text-white"
                />
              </label>
              <button
                type="button"
                onClick={applyRollOver}
                disabled={openPositionCount === 0}
                title={`Adjust ${openPositionCount} open position(s) for contract roll`}
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
              >
                Roll over
              </button>
              <button
                type="button"
                onClick={undoLastAction}
                disabled={undoCount === 0}
                title="Undo last journal action (roll over, add, delete, fill, reorder)"
                className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                Undo{undoCount > 0 ? ` (${undoCount})` : ''}
              </button>
              <button
                type="button"
                onClick={() => void addEntry()}
                disabled={addingEntry}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {addingEntry ? 'Adding…' : 'Add Trade'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-gray-400">Journal Net</span>
                <span
                  className={clsx(
                    'text-2xl font-bold tabular-nums',
                    positionSummary.netPosition > 0 && 'text-emerald-400',
                    positionSummary.netPosition < 0 && 'text-red-400',
                    positionSummary.netPosition === 0 && 'text-gray-300'
                  )}
                >
                  {positionSummary.netPosition > 0 ? '+' : ''}
                  {positionSummary.netPosition}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums">
                <span className="text-gray-500">
                  Long{' '}
                  <span className="font-semibold text-emerald-400">
                    {positionSummary.highestLong > 0 ? positionSummary.highestLong : '—'}
                  </span>
                </span>
                <span className="text-gray-600">+</span>
                <span className="text-gray-500">
                  Short{' '}
                  <span className="font-semibold text-red-400">
                    {positionSummary.highestShort < 0 ? positionSummary.highestShort : '—'}
                  </span>
                </span>
              </div>
            </div>

            {tsConnected && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-l border-zinc-700/80 pl-0 sm:pl-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-400">TradeStation Net</span>
                  {tsLoadingPositions && !tsPositionSummary ? (
                    <span className="text-sm text-gray-500">Loading…</span>
                  ) : tsPositionSummary ? (
                    <span
                      className={clsx(
                        'text-2xl font-bold tabular-nums',
                        tsPositionSummary.netPosition > 0 && 'text-emerald-400',
                        tsPositionSummary.netPosition < 0 && 'text-red-400',
                        tsPositionSummary.netPosition === 0 && 'text-gray-300'
                      )}
                    >
                      {tsPositionSummary.netPosition > 0 ? '+' : ''}
                      {tsPositionSummary.netPosition}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                  {positionsNetMatch != null && (
                    <span
                      title="Compared on net only. Journal Long/Short count open trade rows; TradeStation shows net contracts."
                      className={clsx(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium',
                        positionsNetMatch
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      )}
                    >
                      {positionsNetMatch ? 'Match' : 'Mismatch'}
                    </span>
                  )}
                </div>
                {tsPositionSummary && (
                  <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums">
                    <span className="text-gray-500">
                      Long{' '}
                      <span className="font-semibold text-emerald-400">
                        {tsPositionSummary.highestLong > 0 ? tsPositionSummary.highestLong : '—'}
                      </span>
                    </span>
                    <span className="text-gray-600">+</span>
                    <span className="text-gray-500">
                      Short{' '}
                      <span className="font-semibold text-red-400">
                        {tsPositionSummary.highestShort < 0 ? tsPositionSummary.highestShort : '—'}
                      </span>
                    </span>
                  </div>
                )}
                {tsPositionLines.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[10px] tabular-nums text-gray-500">
                    {tsPositionLines.map((line) => (
                      <span
                        key={line.symbol}
                        className="rounded border border-zinc-700/80 bg-zinc-900/60 px-2 py-0.5"
                      >
                        {line.symbol}{' '}
                        <span
                          className={
                            line.signedQuantity > 0
                              ? 'text-emerald-400'
                              : line.signedQuantity < 0
                                ? 'text-red-400'
                                : 'text-gray-400'
                          }
                        >
                          {line.signedQuantity > 0 ? '+' : ''}
                          {line.signedQuantity}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void loadTradeStationPositions()}
                  disabled={tsLoadingPositions}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {tsLoadingPositions ? 'Refreshing…' : 'Refresh TS position'}
                </button>
              </div>
            )}
          </div>

          <div className="border-b border-zinc-800/80 px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-gray-400">Monthly P&L</h3>
              <button
                type="button"
                onClick={addMonthlyProfitEntry}
                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-gray-300 hover:bg-zinc-800"
              >
                + Add month profit
              </button>
            </div>

            {monthlySummaries.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {monthlySummaries.map((month) => (
                  <div
                    key={month.monthKey}
                    className={clsx(
                      'min-w-[8.5rem] rounded-lg border px-3 py-2',
                      month.monthKey === currentMonthKey
                        ? 'border-blue-500/50 bg-blue-950/30'
                        : 'border-zinc-700/80 bg-zinc-900/60'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      {month.label}
                      {month.monthKey === currentMonthKey && (
                        <span className="rounded bg-blue-500/20 px-1 text-[9px] text-blue-300">
                          current
                        </span>
                      )}
                    </div>
                    <div
                      className={clsx(
                        'text-sm font-semibold tabular-nums',
                        month.total > 0 && 'text-emerald-400',
                        month.total < 0 && 'text-red-400',
                        month.total === 0 && 'text-gray-300'
                      )}
                    >
                      {month.total > 0 ? '+' : ''}
                      {month.total.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-600">
                      trades {month.tradeCount > 0 ? month.tradeTotal.toFixed(2) : '—'}
                      {month.adjustmentCount > 0 && (
                        <>
                          {' '}
                          · adj {month.adjustmentTotal > 0 ? '+' : ''}
                          {month.adjustmentTotal.toFixed(2)}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-xs text-gray-500">Close trades or add manual month profit below.</p>
            )}

            {monthlyProfitEntries.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Manual month profit — move P&L between months, carry-over, corrections.
                </p>
                {monthlyProfitEntries.map((line) => (
                  <div
                    key={line.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-2 py-2"
                  >
                    <input
                      type="month"
                      value={line.monthKey}
                      onChange={(e) =>
                        updateMonthlyProfitEntry(line.id, { monthKey: e.target.value })
                      }
                      className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={line.amount}
                      onChange={(e) =>
                        updateMonthlyProfitEntry(line.id, {
                          amount: parseNumber(e.target.value) ?? 0,
                        })
                      }
                      placeholder="Amount"
                      className="w-[10ch] rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs tabular-nums text-white"
                    />
                    <input
                      type="text"
                      value={line.note}
                      onChange={(e) => updateMonthlyProfitEntry(line.id, { note: e.target.value })}
                      placeholder="Note (e.g. April carry-over)"
                      className="min-w-[12rem] flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeMonthlyProfitEntry(line.id)}
                      className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-b border-zinc-800/80 px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-gray-400">
                  Parked Losses · Sacrifice pool
                </h3>
                <p className="text-[11px] text-gray-600">
                  Sacrifice a losing position to park its points here instead of this
                  month&apos;s P&amp;L. Later, Contribute a winning close to the pool to work
                  it back toward zero (e.g. −1000 + 100 → −900).
                </p>
              </div>
            </div>

            {sacrificePoolTotals.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {sacrificePoolTotals.map((pool) => (
                  <div
                    key={pool.instrumentType}
                    className="min-w-[8.5rem] rounded-lg border border-orange-500/40 bg-orange-950/20 px-3 py-2"
                  >
                    <div className="text-xs text-gray-500">{pool.label} parked</div>
                    <div
                      className={clsx(
                        'text-sm font-semibold tabular-nums',
                        pool.points > 0 && 'text-emerald-400',
                        pool.points < 0 && 'text-red-400',
                        pool.points === 0 && 'text-gray-300'
                      )}
                    >
                      {pool.points > 0 ? '+' : ''}
                      {pool.points} pts
                    </div>
                    <div className="text-[10px] text-gray-600">
                      {pool.sacrificeCount} sacrificed · {pool.contributionCount} contributed
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-2 text-xs text-gray-500">
                No parked losses. Use <span className="text-orange-300">Sacrifice</span> on a
                TradeStation fill to move a loss here.
              </p>
            )}

            {sortedSacrificePoolEntries.length > 0 && (
              <ul className="space-y-1">
                {sortedSacrificePoolEntries.map((line) => (
                  <li
                    key={line.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-2 py-1.5 text-xs"
                  >
                    <span className="tabular-nums text-gray-500">{line.date}</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                      {instrumentShortLabel(line.instrumentType)}
                    </span>
                    <span
                      className={clsx(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium',
                        line.kind === 'contribution'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-orange-500/15 text-orange-300'
                      )}
                    >
                      {line.kind === 'contribution' ? 'Contribute' : 'Sacrifice'}
                    </span>
                    <span
                      className={clsx(
                        'tabular-nums font-semibold',
                        line.points >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {line.points > 0 ? '+' : ''}
                      {line.points} pts
                    </span>
                    <span className="min-w-0 flex-1 truncate text-gray-500">{line.note}</span>
                    <button
                      type="button"
                      onClick={() => removeSacrificePoolEntry(line.id)}
                      className="rounded-md px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="overflow-x-auto pb-4">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="bg-zinc-900/80 text-gray-300">
                <tr>
                  <th className="w-8 px-1 py-3" aria-label="Reorder" />
                  <th className="px-3 py-3 text-left font-medium">
                    <button
                      type="button"
                      onClick={() =>
                        setEntryDateSort((prev) =>
                          prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
                        )
                      }
                      title="Sort by entry date (newest first, oldest first, or manual order)"
                      className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-zinc-800 hover:text-white"
                    >
                      Entry Date
                      <span className="text-[10px] text-blue-300 tabular-nums">
                        {entryDateSort === 'asc' ? '↑' : entryDateSort === 'desc' ? '↓' : '↕'}
                      </span>
                    </button>
                  </th>
                  <th className="px-2 py-3 text-left font-medium w-[7.5rem]">Close Date</th>
                  <th
                    className="px-3 py-3 text-left font-medium w-20"
                    title="Open long 1,2,3… / open short −1,−2,… — clears when sold"
                  >
                    Position
                  </th>
                  <th className="px-2 py-3 text-left font-medium w-[4.5rem]">Type</th>
                  <th className="px-3 py-3 text-left font-medium w-20">Size</th>
                  <th
                    className={`py-3 text-left font-medium ${PRICE_COL}`}
                    title="Positive = long entry. Negative = short entry."
                  >
                    Buy
                  </th>
                  <th className={`py-3 text-left font-medium ${PRICE_COL}`}>Sold</th>
                  <th className={`py-3 text-left font-medium ${PRICE_COL}`}>Target</th>
                  <th className={`py-3 text-left font-medium ${PRICE_COL}`}>Profit</th>
                  <th
                    className="px-1 py-3 text-left font-medium w-[6.5rem]"
                    title="Count this trade's profit in a different month (defaults to close date month)"
                  >
                    P&L Month
                  </th>
                  <th className="px-3 py-3 text-left font-medium min-w-[22rem]">Reason</th>
                  <th className="px-3 py-3 text-left font-medium w-20" />
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-gray-400">
                      No trades yet. Click &quot;Add Trade&quot; to start recording.
                    </td>
                  </tr>
                ) : (
                  displayEntries.map((entry) => {
                    const tradeNo = getTradeNumber(entries, entry.id)
                    const isShort = isShortPosition(entry.buyPrice)
                    const profit = getEntryProfit(entry)
                    return (
                      <tr
                        key={entry.id}
                        onDragOver={(e) => {
                          if (entryDateSort) return
                          e.preventDefault()
                          if (draggedId && draggedId !== entry.id) {
                            setDragOverId(entry.id)
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverId === entry.id) setDragOverId(null)
                        }}
                        onDrop={(e) => {
                          if (entryDateSort) return
                          e.preventDefault()
                          if (e.dataTransfer.types.includes(TS_FILL_DRAG_TYPE)) return
                          const fromId = e.dataTransfer.getData('text/plain') || draggedId
                          if (fromId) moveEntry(fromId, entry.id)
                          clearDragState()
                        }}
                        className={clsx(
                          'border-t border-zinc-800/80 hover:bg-zinc-900/40',
                          draggedId === entry.id && 'opacity-40',
                          dragOverId === entry.id && 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/40'
                        )}
                      >
                        <td className="px-1 py-2 w-8">
                          <span
                            draggable={!entryDateSort}
                            onDragStart={(e) => {
                              if (entryDateSort) return
                              setDraggedId(entry.id)
                              e.dataTransfer.setData('text/plain', entry.id)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={clearDragState}
                            className={clsx(
                              'inline-flex touch-none items-center justify-center rounded p-1 text-zinc-500',
                              entryDateSort
                                ? 'cursor-default opacity-30'
                                : 'cursor-grab hover:bg-zinc-800 hover:text-zinc-300 active:cursor-grabbing'
                            )}
                            title={
                              entryDateSort
                                ? 'Clear date sort (↕) to drag rows'
                                : 'Drag to reorder'
                            }
                            aria-label="Drag to reorder"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={entry.entryDate}
                            onChange={(e) => updateEntry(entry.id, { entryDate: e.target.value })}
                            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white"
                          />
                        </td>
                        <td className="px-2 py-2 w-[7.5rem]">
                          <input
                            type="date"
                            value={entry.closeDate ?? ''}
                            onChange={(e) => {
                              const closeDate = e.target.value || null
                              const patch: Partial<TradeJournalEntry> = { closeDate }
                              if (entry.soldPrice != null) {
                                const profitMonth = defaultProfitMonthOnClose({
                                  profitMonth: entry.profitMonth,
                                  closeDate,
                                })
                                if (profitMonth) patch.profitMonth = profitMonth
                              }
                              updateEntry(entry.id, patch)
                            }}
                            title="Date position was closed (sold)"
                            className="w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-1 py-1.5 text-xs text-white"
                          />
                        </td>
                        <td className="px-3 py-2 tabular-nums font-medium">
                          {tradeNo == null ? (
                            <span className="text-gray-500">—</span>
                          ) : (
                            <span className={isShort ? 'text-red-400' : 'text-emerald-400'}>
                              {tradeNo}
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-2 w-[4.5rem]">
                          <select
                            value={entry.instrumentType}
                            onChange={(e) =>
                              updateEntry(entry.id, {
                                instrumentType: e.target.value as InstrumentType,
                              })
                            }
                            title={
                              INSTRUMENT_OPTIONS.find((o) => o.value === entry.instrumentType)
                                ?.label
                            }
                            className="w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-1 py-1.5 text-xs text-white"
                          >
                            {INSTRUMENT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value} title={option.label}>
                                {option.shortLabel}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={entry.positionSize}
                            onChange={(e) => {
                              const parsed = parseNumber(e.target.value)
                              updateEntry(entry.id, {
                                positionSize: parsed != null && parsed > 0 ? Math.floor(parsed) : 1,
                              })
                            }}
                            title={
                              INSTRUMENT_OPTIONS.find((o) => o.value === entry.instrumentType)
                                ?.sizeLabel
                            }
                            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white"
                          />
                        </td>
                        <td
                          className={clsx(
                            `py-2 ${PRICE_COL}`,
                            tsDropTarget?.entryId === entry.id &&
                              tsDropTarget.field === 'buy' &&
                              'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/50'
                          )}
                          onDragOver={(e) => {
                            if (!e.dataTransfer.types.includes(TS_FILL_DRAG_TYPE)) return
                            e.preventDefault()
                            e.stopPropagation()
                            setTsDropTarget({ entryId: entry.id, field: 'buy' })
                          }}
                          onDragLeave={() => {
                            if (tsDropTarget?.entryId === entry.id && tsDropTarget.field === 'buy') {
                              setTsDropTarget(null)
                            }
                          }}
                          onDrop={(e) => handleTsFillDrop(entry.id, 'buy', e)}
                        >
                          <input
                            type="number"
                            step="0.01"
                            value={formatNumber(entry.buyPrice)}
                            onChange={(e) =>
                              updateEntry(entry.id, { buyPrice: parseNumber(e.target.value) })
                            }
                            title="Drop an open fill here, or type price. Positive = long, negative = short."
                            placeholder="±price"
                            className={clsx(
                              PRICE_INPUT,
                              isShort && 'text-red-400',
                              entry.buyPrice != null && entry.buyPrice > 0 && 'text-emerald-400'
                            )}
                          />
                        </td>
                        <td
                          className={clsx(
                            `py-2 ${PRICE_COL}`,
                            tsDropTarget?.entryId === entry.id &&
                              tsDropTarget.field === 'sold' &&
                              'bg-amber-500/15 ring-1 ring-inset ring-amber-500/50'
                          )}
                          onDragOver={(e) => {
                            if (!e.dataTransfer.types.includes(TS_FILL_DRAG_TYPE)) return
                            e.preventDefault()
                            e.stopPropagation()
                            setTsDropTarget({ entryId: entry.id, field: 'sold' })
                          }}
                          onDragLeave={() => {
                            if (tsDropTarget?.entryId === entry.id && tsDropTarget.field === 'sold') {
                              setTsDropTarget(null)
                            }
                          }}
                          onDrop={(e) => handleTsFillDrop(entry.id, 'sold', e)}
                        >
                          <input
                            type="number"
                            step="0.01"
                            value={formatNumber(entry.soldPrice)}
                            onChange={(e) => {
                              const soldPrice = parseNumber(e.target.value)
                              const patch: Partial<TradeJournalEntry> = { soldPrice }
                              if (soldPrice == null) {
                                patch.closeDate = null
                                patch.closeReason = null
                              } else {
                                const closeDate =
                                  entry.closeDate ?? new Date().toISOString().slice(0, 10)
                                if (!entry.closeDate) patch.closeDate = closeDate
                                const profitMonth = defaultProfitMonthOnClose({
                                  profitMonth: entry.profitMonth,
                                  closeDate: patch.closeDate ?? closeDate,
                                })
                                if (profitMonth) patch.profitMonth = profitMonth
                              }
                              updateEntry(entry.id, patch)
                            }}
                            title="Drop a close fill here, or type price."
                            className={PRICE_INPUT}
                          />
                        </td>
                        <td className={`py-2 ${PRICE_COL}`}>
                          <input
                            type="number"
                            step="0.01"
                            value={formatNumber(entry.targetPrice)}
                            onChange={(e) =>
                              updateEntry(entry.id, { targetPrice: parseNumber(e.target.value) })
                            }
                            className={PRICE_INPUT}
                          />
                        </td>
                        <td className={`py-2 text-xs tabular-nums ${PRICE_COL}`}>
                          <span
                            className={
                              profit == null
                                ? 'text-gray-500'
                                : profit >= 0
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                            }
                          >
                            {profit == null ? '—' : profit.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-1 py-2 w-[6.5rem]">
                          <input
                            type="month"
                            value={entry.profitMonth ?? ''}
                            onChange={(e) =>
                              updateEntry(entry.id, {
                                profitMonth: e.target.value || null,
                              })
                            }
                            title="Leave blank to use close date month"
                            className="w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-1 py-1.5 text-xs text-white"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[22rem]">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={entry.reason}
                              onChange={(e) => updateEntry(entry.id, { reason: e.target.value })}
                              placeholder="Open — M1/M2 entry day"
                              title="Model 1 long/short tier and Model 2 signals for entry date"
                              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={entry.closeReason ?? ''}
                              onChange={(e) =>
                                updateEntry(entry.id, {
                                  closeReason: e.target.value || null,
                                })
                              }
                              placeholder="Close — M1/M2 exit day"
                              title="Model 1 long/short tier and Model 2 signals for close date (filled on take profit)"
                              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-gray-300"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            className="rounded-md px-2 py-1 text-red-400 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
