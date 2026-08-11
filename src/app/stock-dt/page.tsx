'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { fetchAuthSession } from 'aws-amplify/auth'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AutoRefreshControls from '@/components/ui/AutoRefreshControls'
import DtMarketQuotesBoard from '@/components/dt/DtMarketQuotesBoard'
import DtPnlCalendar from '@/components/dt/DtPnlCalendar'
import StockDtPositionsPanel, {
  type StockDtOpenPosition,
  type StockDtWorkingOrder,
} from '@/components/stock-dt/StockDtPositionsPanel'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { useAuthStore } from '@/lib/auth-store'
import { readDtSimAccountId, writeDtSimAccountId } from '@/lib/dt-account'
import type { DtFlattenUndoLot } from '@/lib/dt-flatten-undo'
import type { DtPnlSnapshot } from '@/lib/dt-pnl-types'
import {
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
} from '@/lib/dt-quotes'
import {
  STOCK_DT_RECLAIM_MIN_WIN_PCT,
  STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT,
  STOCK_DT_SCORE_LINE,
  STOCK_DT_SIDE_BUDGET,
  isReclaimBuySource,
  type StockDtBuySource,
  type StockDtCandidate,
  type StockDtPlanResponse,
  type StockDtSide,
} from '@/lib/stock-dt'
import { formatTradingDayLabel, todayTradingDay } from '@/lib/dt-position-days'

export const dynamic = 'force-dynamic'

type TsAccount = { id: string; type?: string; alias?: string; env?: string }

async function authHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {}
  try {
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken?.toString()
    if (idToken) headers.Authorization = `Bearer ${idToken}`
  } catch {
    // API will 401 if unauthenticated
  }
  return headers
}

function money(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `$${n.toFixed(2)}`
}

function SideTable({
  title,
  side,
  plan,
  source,
  scoreLine,
  asOf,
  selected,
  onToggle,
  onChangeQuantity,
}: {
  title: string
  side: StockDtSide
  plan: StockDtPlanResponse['long'] | undefined
  source: StockDtBuySource
  scoreLine: number
  asOf?: string | null
  selected: Set<string>
  onToggle: (id: string) => void
  onChangeQuantity: (candidateId: string, quantity: number) => void
}) {
  if (!plan) return null

  const overSuggested = plan.spent > plan.budget
  const filterLabel =
    source === 'model_reclaim_close'
      ? `Live long pred_low breach · win ≥ ${scoreLine}%`
      : source === 'model_reclaim'
        ? `Model Reclaim win ≥ ${scoreLine}%`
        : `Summary total ≥ ${scoreLine}`

  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/85 to-zinc-950/90 overflow-hidden">
      <header className="border-b border-zinc-800/80 px-4 py-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-xs text-zinc-400 mt-1">
            {filterLabel}
            {asOf ? (
              <>
                {' '}
                · model <span className="font-mono text-emerald-300/90">{asOf}</span>
                {asOf === todayTradingDay() ? (
                  <span className="ml-1 text-emerald-300">· Today</span>
                ) : (
                  <span className="ml-1 text-amber-300">· Not today</span>
                )}
              </>
            ) : null}{' '}
            · {side === 'long' ? 'Buy' : 'SellShort'} · score-weighted across ~{money(plan.budget)}
          </p>
        </div>
        <div className="text-xs text-zinc-400 text-right">
          <div className={overSuggested ? 'text-amber-300' : undefined}>
            Est. {money(plan.spent)}
            <span className="text-zinc-500"> · suggested start {money(plan.budget)}</span>
          </div>
          <div className="text-zinc-500">Budget guides initial qty only — not a buy cap</div>
        </div>
      </header>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-950/95 text-[11px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">OK</th>
              <th className="px-3 py-2 text-left">Ticker</th>
              <th className="px-3 py-2 text-right">
                {isReclaimBuySource(source) ? 'Win %' : 'Score'}
              </th>
              <th className="px-3 py-2 text-right">Last</th>
              <th className="px-3 py-2 text-right">Change</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">vs Open</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">vs Open %</th>
              {source === 'model_reclaim_close' && (
                <>
                  <th className="px-3 py-2 text-right">Low</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">OS %</th>
                </>
              )}
              {isReclaimBuySource(source) && (
                <>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Target</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Stop</th>
                </>
              )}
              <th className="px-3 py-2 text-right">Weight</th>
              <th className="px-3 py-2 text-right">Target $</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {plan.candidates.length === 0 && (
              <tr>
                <td
                  colSpan={
                    source === 'model_reclaim_close'
                      ? 16
                      : isReclaimBuySource(source)
                        ? 14
                        : 12
                  }
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  {source === 'model_reclaim_close'
                    ? side === 'short'
                      ? 'Reclaim-at Close is long-only — shorts stay empty.'
                      : `No live long pred_low breaches with win ≥ ${scoreLine}%.`
                    : source === 'model_reclaim'
                      ? `No tradeable Model Reclaim names with win rate ≥ ${scoreLine}% for this side.`
                      : `No tradeable stocks above the ${scoreLine} line for this side.`}
                </td>
              </tr>
            )}
            {plan.candidates.map((row) => {
              const checked = selected.has(row.id)
              const chgPositive = (row.netChange ?? row.netChangePct ?? 0) >= 0
              return (
                <tr
                  key={row.id}
                  className={`border-t border-zinc-800/50 ${checked ? 'bg-zinc-900/40' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(row.id)}
                      className="h-4 w-4 rounded border-zinc-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-mono text-white">{row.ticker}</div>
                    <div className="text-[11px] text-zinc-500">{row.reason}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-200 tabular-nums">
                    {row.summaryScore.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-200 tabular-nums">
                    {formatMoney(row.last ?? row.price)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      row.netChange == null && row.netChangePct == null
                        ? 'text-zinc-500'
                        : chgPositive
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                    }`}
                  >
                    {row.netChange == null && row.netChangePct == null ? (
                      '—'
                    ) : (
                      <>
                        {formatSignedMoney(row.netChange)}{' '}
                        <span className="text-[11px]">({formatSignedPct(row.netChangePct)})</span>
                      </>
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      row.fromOpen == null || !Number.isFinite(row.fromOpen)
                        ? 'text-zinc-500'
                        : row.fromOpen >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                    }`}
                  >
                    {formatSignedMoney(row.fromOpen)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      row.fromOpenPct == null || !Number.isFinite(row.fromOpenPct)
                        ? 'text-zinc-500'
                        : row.fromOpenPct >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                    }`}
                  >
                    {formatSignedPct(row.fromOpenPct)}
                  </td>
                  {source === 'model_reclaim_close' && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-200">
                        {money(row.dayLow)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-300">
                        {formatSignedPct(row.overshootPct)}
                      </td>
                    </>
                  )}
                  {isReclaimBuySource(source) && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-200">
                        {money(row.targetClose ?? undefined)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-200">
                        {money(row.stopLoss ?? undefined)}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                    {(row.weight * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                    {money(row.targetDollars)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                    {money(row.price)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={row.quantity}
                      onChange={(e) =>
                        onChangeQuantity(row.id, Number(e.target.value))
                      }
                      className="w-16 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-right text-zinc-100"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-200 tabular-nums">
                    {money(row.estimatedCost)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {plan.skipped.length > 0 && (
        <div className="border-t border-zinc-800/80 px-4 py-3">
          <p className="text-xs font-medium text-zinc-400 mb-1">Skipped</p>
          <ul className="text-xs text-zinc-500 space-y-0.5">
            {plan.skipped.map((s) => (
              <li key={`${side}-skip-${s.ticker}`}>
                <span className="text-zinc-300">{s.ticker}</span> (score {s.score}) — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function StockDtPageContent() {
  const { isAuthenticated } = useAuthStore()
  const [tsConnected, setTsConnected] = useState(false)
  const [tradeScopesOk, setTradeScopesOk] = useState(false)
  const [simAccounts, setSimAccounts] = useState<TsAccount[]>([])
  const [liveAccounts, setLiveAccounts] = useState<TsAccount[]>([])
  const [simError, setSimError] = useState<string | null>(null)
  const [serverConfigured, setServerConfigured] = useState(true)
  const [accountId, setAccountId] = useState<string>(() => readDtSimAccountId())
  const [manualAccountId, setManualAccountId] = useState(() => readDtSimAccountId())
  const [tsMessage, setTsMessage] = useState<string | null>(null)
  const [plan, setPlan] = useState<StockDtPlanResponse | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [flattening, setFlattening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placeResult, setPlaceResult] = useState<string | null>(null)
  const [positions, setPositions] = useState<StockDtOpenPosition[]>([])
  const [workingOrders, setWorkingOrders] = useState<StockDtWorkingOrder[]>([])
  const [buyingPower, setBuyingPower] = useState<number | null>(null)
  const [positionTotals, setPositionTotals] = useState({
    marketValue: 0,
    totalCost: 0,
    unrealizedPnl: 0,
    shares: 0,
  })
  const [positionsLoading, setPositionsLoading] = useState(false)
  const [busySymbol, setBusySymbol] = useState<string | null>(null)
  const [busyDay, setBusyDay] = useState<string | null>(null)
  const [flattenUndo, setFlattenUndo] = useState<DtFlattenUndoLot[] | null>(null)
  const [undoing, setUndoing] = useState(false)
  const [pnlSnapshot, setPnlSnapshot] = useState<DtPnlSnapshot | null>(null)
  const [pnlLoading, setPnlLoading] = useState(false)
  const [buySource, setBuySource] = useState<StockDtBuySource>('model_reclaim')
  const [sideBudget, setSideBudget] = useState(STOCK_DT_SIDE_BUDGET)
  const [minWinPct, setMinWinPct] = useState(STOCK_DT_RECLAIM_MIN_WIN_PCT)
  const [minWinPctShort, setMinWinPctShort] = useState(STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT)

  const refreshTs = useCallback(async () => {
    if (!isAuthenticated) {
      setTsConnected(false)
      return
    }
    try {
      const res = await fetch('/api/tradestation/status?sim=1', {
        headers: await authHeaders(),
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        setTsConnected(false)
        return
      }
      const data = (await res.json()) as {
        connected?: boolean
        configured?: boolean
        tradeScopesOk?: boolean
        simAccounts?: TsAccount[]
        accounts?: TsAccount[]
        simError?: string | null
        missingCredentials?: boolean
      }
      setTsConnected(Boolean(data.connected))
      setTradeScopesOk(Boolean(data.tradeScopesOk))
      setServerConfigured(data.configured !== false && !data.missingCredentials)
      setSimError(data.simError || null)
      const sims = data.simAccounts ?? []
      const live = data.accounts ?? []
      setSimAccounts(sims)
      setLiveAccounts(live)
      setAccountId((prev) => {
        if (prev && (sims.some((a) => a.id === prev) || prev.startsWith('SIM'))) return prev
        const equity =
          sims.find((a) => {
            const t = (a.type || '').toLowerCase()
            return t.includes('margin') || t.includes('cash') || !t.includes('future')
          }) ?? sims[0]
        return equity?.id ?? prev
      })
    } catch {
      setTsConnected(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void refreshTs()
  }, [refreshTs])

  const loadPositions = useCallback(async () => {
    if (!accountId || !tsConnected) {
      setPositions([])
      setWorkingOrders([])
      setBuyingPower(null)
      setPositionTotals({ marketValue: 0, totalCost: 0, unrealizedPnl: 0, shares: 0 })
      return
    }
    setPositionsLoading(true)
    try {
      const res = await fetch(
        `/api/stock-dt/positions?accountId=${encodeURIComponent(accountId)}`,
        {
          headers: await authHeaders(),
          credentials: 'include',
          cache: 'no-store',
        }
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setPositions((body.positions as StockDtOpenPosition[]) || [])
      setWorkingOrders((body.workingOrders as StockDtWorkingOrder[]) || [])
      setBuyingPower(
        typeof body.buyingPower === 'number' && Number.isFinite(body.buyingPower)
          ? body.buyingPower
          : null
      )
      setPositionTotals(
        body.totals || { marketValue: 0, totalCost: 0, unrealizedPnl: 0, shares: 0 }
      )
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions')
    } finally {
      setPositionsLoading(false)
    }
  }, [accountId, tsConnected])

  const loadPnl = useCallback(async () => {
    if (!accountId || !tsConnected) {
      setPnlSnapshot(null)
      return
    }
    setPnlLoading(true)
    try {
      const res = await fetch(
        `/api/stock-dt/pnl?accountId=${encodeURIComponent(accountId)}`,
        {
          headers: await authHeaders(),
          credentials: 'include',
          cache: 'no-store',
        }
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setPnlSnapshot(body as DtPnlSnapshot)
    } catch (err) {
      setPnlSnapshot(null)
      setError(err instanceof Error ? err.message : 'Failed to load P&L calendar')
    } finally {
      setPnlLoading(false)
    }
  }, [accountId, tsConnected])

  useEffect(() => {
    void loadPositions()
  }, [loadPositions])

  useEffect(() => {
    void loadPnl()
  }, [loadPnl])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ts = params.get('ts')
    if (!ts) return
    if (ts === 'connected')
      setTsMessage('TradeStation connected. Pick your paper account, then load candidates.')
    else if (ts === 'denied') setTsMessage('TradeStation authorization was declined.')
    else if (ts === 'not_configured') {
      setTsMessage(
        'This server is missing TRADESTATION_CLIENT_ID / SECRET. On localhost, copy them from Vercel into .env.local and restart next — or reconnect on the deployed Predixa site.'
      )
      setServerConfigured(false)
    } else if (ts === 'signin') setTsMessage('Sign in to Predixa first, then reconnect TradeStation.')
    else setTsMessage('TradeStation connection failed. Check callback URL / Vercel keys.')
    params.delete('ts')
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
    )
    void refreshTs()
  }, [refreshTs])

  const allCandidates = useMemo(() => {
    if (!plan) return [] as StockDtCandidate[]
    return [...plan.long.candidates, ...plan.short.candidates]
  }, [plan])

  const selectedCandidates = useMemo(
    () => allCandidates.filter((c) => selected.has(c.id)),
    [allCandidates, selected]
  )

  const placeableCandidates = useMemo(
    () => selectedCandidates.filter((c) => c.quantity > 0),
    [selectedCandidates]
  )

  const selectedCost = useMemo(
    () => placeableCandidates.reduce((sum, c) => sum + c.estimatedCost, 0),
    [placeableCandidates]
  )

  const loadPlan = useCallback(async () => {
    if (!tsConnected) return
    setLoadingPlan(true)
    setError(null)
    setPlaceResult(null)
    try {
      const budget = Math.max(
        100,
        Math.min(1_000_000, Number.isFinite(sideBudget) ? Math.round(sideBudget) : STOCK_DT_SIDE_BUDGET)
      )
      const winFloorLong = Math.max(
        0,
        Math.min(
          100,
          Number.isFinite(minWinPct) ? minWinPct : STOCK_DT_RECLAIM_MIN_WIN_PCT
        )
      )
      const winFloorShort = Math.max(
        0,
        Math.min(
          100,
          Number.isFinite(minWinPctShort) ? minWinPctShort : STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT
        )
      )
      const params = new URLSearchParams()
      if (accountId) params.set('accountId', accountId)
      params.set('source', buySource)
      params.set('budget', String(budget))
      if (isReclaimBuySource(buySource)) {
        params.set('minWinPctLong', String(winFloorLong))
        if (buySource === 'model_reclaim') {
          params.set('minWinPctShort', String(winFloorShort))
        }
      }
      const res = await fetch(`/api/stock-dt/candidates?${params}`, {
        headers: await authHeaders(),
        credentials: 'include',
        cache: 'no-store',
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      const next = body as StockDtPlanResponse
      setPlan(next)
      setSelected(new Set([...next.long.candidates, ...next.short.candidates].map((c) => c.id)))
    } catch (err) {
      setPlan(null)
      setError(err instanceof Error ? err.message : 'Failed to load candidates')
    } finally {
      setLoadingPlan(false)
    }
  }, [accountId, tsConnected, buySource, sideBudget, minWinPct, minWinPctShort])

  useEffect(() => {
    if (!tsConnected || !accountId || !tradeScopesOk) return
    void loadPlan()
    // Budget / min-win apply on Reload; auto-load when account or buy source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tsConnected, accountId, tradeScopesOk, buySource])

  const softRefreshQuotes = useCallback(() => {
    void loadPlan()
    void loadPositions()
  }, [loadPlan, loadPositions])

  const { autoRefresh, setAutoRefresh, intervalMs } = useAutoRefresh(softRefreshQuotes, {
    enabled: Boolean(tsConnected && accountId && tradeScopesOk),
  })

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const changeQuantity = (candidateId: string, quantity: number) => {
    setPlan((prev) => {
      if (!prev) return prev
      const sideKey = candidateId.startsWith('long:') ? 'long' : 'short'
      const sidePlan = prev[sideKey]
      const idx = sidePlan.candidates.findIndex((c) => c.id === candidateId)
      if (idx < 0) return prev
      const qty = Math.max(0, Math.min(10_000, Number.isFinite(quantity) ? Math.floor(quantity) : 0))
      const row = sidePlan.candidates[idx]
      if (qty === row.quantity) return prev
      const candidates = sidePlan.candidates.map((c, i) =>
        i === idx
          ? {
              ...c,
              quantity: qty,
              estimatedCost: Math.round(qty * c.price * 100) / 100,
            }
          : c
      )
      const spent = Math.round(candidates.reduce((s, c) => s + c.estimatedCost, 0) * 100) / 100
      return {
        ...prev,
        [sideKey]: {
          ...sidePlan,
          candidates,
          spent,
          remaining: Math.round((sidePlan.budget - spent) * 100) / 100,
        },
      }
    })
  }

  const confirmAndPlace = async () => {
    if (placeableCandidates.length === 0) return
    const longs = placeableCandidates.filter((c) => c.side === 'long').length
    const shorts = placeableCandidates.filter((c) => c.side === 'short').length
    const ok = window.confirm(
      `Place ${placeableCandidates.length} paper stock order(s) on account ${accountId}?\n` +
        `${longs} Buy · ${shorts} SellShort\n` +
        `Est. notional ~${money(selectedCost)}\n\n` +
        `Remember to Flatten before close.`
    )
    if (!ok) return

    setPlacing(true)
    setPlaceResult(null)
    setError(null)
    try {
      const res = await fetch('/api/stock-dt/place', {
        method: 'POST',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ accountId, candidates: placeableCandidates }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      const resultRows = Array.isArray(body.results)
        ? (body.results as Array<{
            ticker?: string
            ok?: boolean
            status?: string
            message?: string
          }>)
        : []
      const failBits = resultRows
        .filter((r) => !r.ok)
        .map((r) => `${r.ticker || '?'}: ${r.message || 'rejected'}`)
      const workingBits = resultRows
        .filter((r) => r.ok && (r.message || '').toLowerCase().includes('working'))
        .map((r) => `${r.ticker || '?'}: ${r.message}`)
      setPlaceResult(
        [
          `Placed ${body.placed}, failed ${body.failed}.`,
          workingBits.length ? workingBits.join(' · ') : '',
          failBits.length ? failBits.join(' · ') : '',
          body.note || '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim()
      )
      if (body.failed > 0) {
        setError(failBits.join(' · ') || 'One or more orders were rejected')
      }
      // Sim fills can lag the accept — refresh now and once more after a beat.
      void loadPositions()
      void loadPnl()
      window.setTimeout(() => {
        void loadPositions()
        void loadPnl()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Place failed')
    } finally {
      setPlacing(false)
    }
  }

  const flatten = async () => {
    if (!accountId) return
    const ok = window.confirm(
      `Close all stock positions on paper account ${accountId}? (Sell longs / BuyToCover shorts)`
    )
    if (!ok) return
    const snapshot: DtFlattenUndoLot[] = positions.map((p) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      longShort: p.longShort,
    }))
    setFlattening(true)
    setError(null)
    try {
      const res = await fetch('/api/stock-dt/flatten', {
        method: 'POST',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ accountId }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      if (snapshot.length > 0 && (body.closed ?? 0) > 0) {
        setFlattenUndo(snapshot)
      }
      setPlaceResult(`Flattened ${body.closed}, failed ${body.failed}.`)
      void loadPositions()
      void loadPnl()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Flatten failed')
    } finally {
      setFlattening(false)
    }
  }

  const adjustPosition = async (
    symbol: string,
    action: 'buy_more' | 'sell_one' | 'flatten',
    quantity = 1
  ) => {
    if (!accountId) return
    const qty = Math.max(1, Math.floor(quantity))
    const label =
      action === 'buy_more'
        ? `Add +${qty} ${symbol}`
        : action === 'sell_one'
          ? `Trim −${qty} ${symbol}`
          : `Flatten ${symbol}`
    if (!window.confirm(`${label} on paper account ${accountId}?`)) return

    const prior =
      action === 'flatten'
        ? positions.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase())
        : null

    setBusySymbol(symbol)
    setError(null)
    try {
      const res = await fetch('/api/stock-dt/adjust', {
        method: 'POST',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ accountId, symbol, action, quantity: qty }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      if (action === 'flatten' && prior) {
        setFlattenUndo([
          {
            symbol: prior.symbol,
            quantity: prior.quantity,
            longShort: prior.longShort,
          },
        ])
      }
      setPlaceResult(
        action === 'buy_more'
          ? `Added +${qty} ${symbol} (order ${body.orderId}).`
          : action === 'sell_one'
            ? `Trimmed −${qty} ${symbol} (order ${body.orderId}).`
            : `Flattened ${symbol} (order ${body.orderId}).`
      )
      void loadPositions()
      void loadPnl()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adjust failed')
    } finally {
      setBusySymbol(null)
    }
  }

  const flattenDay = async (day: string, symbols: string[]) => {
    if (!accountId || symbols.length === 0) return
    if (
      !window.confirm(
        `Flatten ${symbols.length} stock position(s) from ${day} on paper account ${accountId}?`
      )
    ) {
      return
    }

    const symbolSet = new Set(symbols.map((s) => s.toUpperCase()))
    const snapshot: DtFlattenUndoLot[] = positions
      .filter((p) => symbolSet.has(p.symbol.toUpperCase()))
      .map((p) => ({
        symbol: p.symbol,
        quantity: p.quantity,
        longShort: p.longShort,
      }))

    setBusyDay(day)
    setError(null)
    const closed: DtFlattenUndoLot[] = []
    const failed: string[] = []
    try {
      const headers = {
        ...(await authHeaders()),
        'Content-Type': 'application/json',
      }
      for (const lot of snapshot) {
        try {
          const res = await fetch('/api/stock-dt/adjust', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ accountId, symbol: lot.symbol, action: 'flatten' }),
          })
          const body = await res.json()
          if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
          closed.push(lot)
        } catch {
          failed.push(lot.symbol)
        }
      }
      if (closed.length > 0) setFlattenUndo(closed)
      if (failed.length > 0) {
        setError(`Day flatten partial: closed ${closed.length}, failed ${failed.join(', ')}`)
      }
      setPlaceResult(
        failed.length === 0
          ? `Flattened ${closed.length} position(s) from ${day}.`
          : `Flattened ${closed.length}/${symbols.length} from ${day}.`
      )
      void loadPositions()
      void loadPnl()
    } finally {
      setBusyDay(null)
    }
  }

  const undoFlatten = async () => {
    if (!accountId || !flattenUndo || flattenUndo.length === 0) return
    if (
      !window.confirm(
        `Undo flatten — re-open ${flattenUndo.length} stock position(s) at market on ${accountId}?`
      )
    ) {
      return
    }

    setUndoing(true)
    setError(null)
    const restored: string[] = []
    const failed: string[] = []
    try {
      const headers = {
        ...(await authHeaders()),
        'Content-Type': 'application/json',
      }
      for (const lot of flattenUndo) {
        try {
          const res = await fetch('/api/stock-dt/adjust', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              accountId,
              symbol: lot.symbol,
              action: 'reopen',
              quantity: lot.quantity,
              longShort: lot.longShort,
            }),
          })
          const body = await res.json()
          if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
          restored.push(lot.symbol)
        } catch {
          failed.push(lot.symbol)
        }
      }
      if (failed.length > 0) {
        setError(`Undo partial: restored ${restored.length}, failed ${failed.join(', ')}`)
        setFlattenUndo(flattenUndo.filter((l) => failed.includes(l.symbol)))
      } else {
        setFlattenUndo(null)
      }
      setPlaceResult(
        failed.length === 0
          ? `Undid flatten — re-opened ${restored.length} position(s).`
          : `Undid ${restored.length}/${flattenUndo.length} position(s).`
      )
      void loadPositions()
      void loadPnl()
    } finally {
      setUndoing(false)
    }
  }

  const persistAccount = (id: string) => {
    setAccountId(id)
    setManualAccountId(id)
    if (id) writeDtSimAccountId(id)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse" />
      <div className="relative mx-auto max-w-7xl p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Stock DT
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl">
              Paper equity day-trades from Summary ranks (score ≥ {STOCK_DT_SCORE_LINE}), today&apos;s
              Model Reclaim names (long win ≥ {STOCK_DT_RECLAIM_MIN_WIN_PCT}%, short ≥{' '}
              {STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT}%), or live Reclaim-at Close longs still below
              pred_low. Score-weighted across a soft per-side budget (default{' '}
              {money(STOCK_DT_SIDE_BUDGET)}). Confirm before send. Flat by close.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
            <Link
              href="/option-dt"
              className="font-medium text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
            >
              Option DT →
            </Link>
            <Link
              href="/tickers"
              className="font-medium text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
            >
              ← Ticker ranks
            </Link>
            <Link
              href="/daily/reclaim"
              className="font-medium text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
            >
              Model Reclaim →
            </Link>
            <Link
              href="/daily/reclaim-close"
              className="font-medium text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
            >
              Reclaim-at Close →
            </Link>
          </div>
        </motion.div>

        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 px-4 py-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-white">TradeStation paper</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                tsConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-700 text-zinc-300'
              }`}
            >
              {tsConnected ? 'Connected' : 'Not connected'}
            </span>
            {tsConnected && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  tradeScopesOk
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-200'
                }`}
              >
                {tradeScopesOk ? 'Trade scopes OK' : 'Reconnect for Trade + MarketData'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <a
              href="/api/tradestation/connect?returnTo=/stock-dt"
              className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2"
            >
              {tsConnected ? 'Reconnect TradeStation' : 'Connect TradeStation'}
            </a>
            <select
              value={simAccounts.some((a) => a.id === accountId) ? accountId : ''}
              onChange={(e) => persistAccount(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 text-sm px-3 py-2 min-w-[14rem]"
            >
              <option value="">Select sim account…</option>
              {simAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alias || a.id} {a.type ? `(${a.type})` : ''}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={manualAccountId}
              onChange={(e) => setManualAccountId(e.target.value.trim())}
              placeholder="Or paste SIM… e.g. SIM1847602F"
              className="rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 text-sm px-3 py-2 min-w-[16rem] font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const id = manualAccountId.trim().toUpperCase()
                if (!id) return
                persistAccount(id)
                setTsMessage(`Using paper account ${id}`)
              }}
              className="rounded-lg border border-zinc-600 text-zinc-200 hover:bg-zinc-800 text-sm font-medium px-3 py-2"
            >
              Use account
            </button>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="whitespace-nowrap">Buy from</span>
              <select
                value={buySource}
                onChange={(e) => setBuySource(e.target.value as StockDtBuySource)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 text-sm px-3 py-2 min-w-[12rem]"
              >
                <option value="model_reclaim">
                  Model Reclaim (long ≥ {STOCK_DT_RECLAIM_MIN_WIN_PCT}% / short ≥{' '}
                  {STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT}%)
                </option>
                <option value="model_reclaim_close">
                  Model Reclaim-at Close (Long) · win ≥ {STOCK_DT_RECLAIM_MIN_WIN_PCT}%
                </option>
                <option value="ticker_ranks">Ticker ranks (Summary)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="whitespace-nowrap">Budget / side $</span>
              <input
                type="number"
                min={100}
                max={1_000_000}
                step={100}
                value={sideBudget}
                onChange={(e) => setSideBudget(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadPlan()
                }}
                className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 text-sm px-3 py-2 tabular-nums"
              />
            </label>
            {isReclaimBuySource(buySource) && (
              <>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="whitespace-nowrap">Long min win %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={minWinPct}
                    onChange={(e) => setMinWinPct(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void loadPlan()
                    }}
                    className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 text-sm px-3 py-2 tabular-nums"
                  />
                </label>
                {buySource === 'model_reclaim' && (
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="whitespace-nowrap">Short min win %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={minWinPctShort}
                      onChange={(e) => setMinWinPctShort(Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void loadPlan()
                      }}
                      className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 text-sm px-3 py-2 tabular-nums"
                    />
                  </label>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => void loadPlan()}
              disabled={loadingPlan || !tsConnected}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-2"
            >
              {loadingPlan ? 'Loading quotes…' : 'Reload candidates'}
            </button>
            <AutoRefreshControls
              autoRefresh={autoRefresh}
              onAutoRefreshChange={setAutoRefresh}
              intervalMs={intervalMs}
              className="text-zinc-400"
            />
            <button
              type="button"
              onClick={() => void confirmAndPlace()}
              disabled={placing || placeableCandidates.length === 0 || !accountId}
              className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-2"
            >
              {placing ? 'Placing…' : `Confirm & place (${placeableCandidates.length})`}
            </button>
            <button
              type="button"
              onClick={() => void flatten()}
              disabled={flattening || !accountId}
              className="rounded-lg border border-rose-500/50 text-rose-200 hover:bg-rose-500/10 disabled:opacity-50 text-sm font-medium px-3 py-2"
            >
              {flattening ? 'Flattening…' : 'Flatten stocks'}
            </button>
          </div>

          {accountId && (
            <p className="text-xs text-zinc-400">
              Active paper account: <span className="font-mono text-emerald-300">{accountId}</span>
              <span className="text-zinc-500"> (shared with Option DT)</span>
            </p>
          )}

          {!serverConfigured && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-3 space-y-2 text-xs text-rose-100 leading-relaxed">
              <p className="font-medium text-rose-200">
                Server missing TradeStation API keys (this is why Reconnect shows an error).
              </p>
              <p>
                Localhost needs{' '}
                <span className="font-mono text-white">TRADESTATION_CLIENT_ID</span>,{' '}
                <span className="font-mono text-white">TRADESTATION_CLIENT_SECRET</span>, and{' '}
                <span className="font-mono text-white">TRADESTATION_REDIRECT_URI</span> in{' '}
                <span className="font-mono text-white">.env.local</span>, then restart Next — or
                reconnect on the deployed Predixa site.
              </p>
            </div>
          )}

          {simAccounts.length === 0 && tsConnected && serverConfigured && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 space-y-2 text-xs text-amber-100/95 leading-relaxed">
              <p className="font-medium text-amber-200">
                Connected, but sim account list is empty. Paste your SIM account above and click Use
                account.
              </p>
              {simError && (
                <p className="font-mono text-[11px] text-amber-200/80 break-words">{simError}</p>
              )}
              <p>
                Live accounts seen: {liveAccounts.length}
                {liveAccounts.length > 0
                  ? ` (${liveAccounts
                      .map((a) => `${a.alias || a.id}${a.type ? `/${a.type}` : ''}`)
                      .join(', ')})`
                  : ''}
                .
              </p>
            </div>
          )}

          {tsMessage && <p className="text-xs text-blue-200">{tsMessage}</p>}
          {plan?.warnings?.map((w) => (
            <p key={w} className="text-xs text-amber-200">
              {w}
            </p>
          ))}
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {placeResult && (
            <p
              className={`text-sm ${
                /failed [1-9]/.test(placeResult) ? 'text-rose-300' : 'text-emerald-300'
              }`}
            >
              {placeResult}
            </p>
          )}
          {plan && (
            <div
              className={`rounded-lg border px-3 py-2 space-y-1 ${
                plan.ranks_as_of && plan.ranks_as_of === todayTradingDay()
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-amber-500/40 bg-amber-500/10'
              }`}
            >
              {(() => {
                const todayEt = todayTradingDay()
                const modelDate = plan.ranks_as_of || null
                const isToday = Boolean(modelDate && modelDate === todayEt)
                return (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-zinc-200">Model date:</span>
                      <span className="font-mono font-semibold text-white">
                        {modelDate || '—'}
                      </span>
                      {modelDate && (
                        <span className="text-xs text-zinc-400">
                          ({formatTradingDayLabel(modelDate, todayEt)})
                        </span>
                      )}
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          isToday
                            ? 'bg-emerald-500/25 text-emerald-200'
                            : 'bg-amber-500/25 text-amber-100'
                        }`}
                      >
                        {isToday ? 'Today' : 'Not today'}
                      </span>
                    </div>
                    {!isToday && (
                      <p className="text-xs text-amber-100/90">
                        Today (ET) is <span className="font-mono">{todayEt}</span>
                        {modelDate
                          ? ` — feeder is behind; confirm before placing.`
                          : ' — no as_of_date on plan.'}
                      </p>
                    )}
                    {isReclaimBuySource(plan.source) &&
                      plan.price_as_of &&
                      plan.price_as_of !== plan.ranks_as_of && (
                        <p className="text-xs text-zinc-400">
                          Breach/OHLC bar:{' '}
                          <span className="font-mono text-zinc-300">{plan.price_as_of}</span>
                          <span className="text-zinc-500"> (last closed session used for math)</span>
                        </p>
                      )}
                    <p className="text-xs text-zinc-500">
                      {plan.source === 'model_reclaim_close'
                        ? `Reclaim-at Close (Long) · live pred_low breach · win ≥ ${plan.min_win_pct_long ?? plan.min_win_pct ?? plan.score_line}%`
                        : plan.source === 'model_reclaim'
                          ? `Model Reclaim · long ≥ ${plan.min_win_pct_long ?? plan.min_win_pct ?? plan.score_line}% / short ≥ ${plan.min_win_pct_short ?? STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT}%`
                          : `Ticker ranks · score ≥ ${plan.score_line}`}{' '}
                      · budget {money(plan.side_budget)}/side · plan built{' '}
                      {new Date(plan.generated_at).toLocaleString()} · selected est.{' '}
                      {money(selectedCost)}
                    </p>
                  </>
                )
              })()}
            </div>
          )}
        </section>

        {tsConnected && accountId && (
          <StockDtPositionsPanel
            positions={positions}
            workingOrders={workingOrders}
            buyingPower={buyingPower}
            totals={positionTotals}
            loading={positionsLoading}
            busySymbol={busySymbol}
            busyDay={busyDay}
            undoing={undoing}
            flattenUndo={flattenUndo}
            onRefresh={() => void loadPositions()}
            onBuyMore={(symbol, qty) => void adjustPosition(symbol, 'buy_more', qty)}
            onSellOne={(symbol, qty) => void adjustPosition(symbol, 'sell_one', qty)}
            onFlatten={(symbol) => void adjustPosition(symbol, 'flatten')}
            onFlattenDay={(day, symbols) => void flattenDay(day, symbols)}
            onUndoFlatten={() => void undoFlatten()}
            onDismissUndo={() => setFlattenUndo(null)}
          />
        )}

        {tsConnected && accountId && (
          <DtPnlCalendar
            assetLabel="Stock"
            snapshot={pnlSnapshot}
            loading={pnlLoading}
            onRefresh={() => void loadPnl()}
          />
        )}

        {loadingPlan && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 px-6 py-16 text-center text-zinc-300">
            {buySource === 'model_reclaim_close'
              ? `Scanning live long pred_low breaches (win ≥ ${minWinPct}%) and equity quotes…`
              : buySource === 'model_reclaim'
                ? `Pulling Model Reclaim names (long ≥ ${minWinPct}% / short ≥ ${minWinPctShort}%) and equity quotes…`
                : `Pulling ranks ≥ ${STOCK_DT_SCORE_LINE} and equity quotes…`}
          </div>
        )}

        {plan && !loadingPlan && (
          <>
            <DtMarketQuotesBoard
              market={plan.market}
              scoreLine={plan.score_line}
              filterLabel={
                plan.source === 'model_reclaim_close'
                  ? `Reclaim-at Close (Long) · live pred_low breach · win ≥ ${plan.min_win_pct_long ?? plan.min_win_pct}%`
                  : plan.source === 'model_reclaim'
                    ? `Model Reclaim long ≥ ${plan.min_win_pct_long ?? plan.min_win_pct}% / short ≥ ${plan.min_win_pct_short ?? STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT}%`
                    : undefined
              }
            />
            <div className="grid grid-cols-1 gap-4">
              {plan.source === 'model_reclaim_close' && (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-emerald-200">
                      Live long breach ({plan.long.candidates.length})
                    </h3>
                    <Link
                      href="/daily/reclaim-close"
                      className="text-xs text-blue-300 hover:text-blue-200"
                    >
                      Same filter as Reclaim-at Close →
                    </Link>
                  </div>
                  {plan.long.candidates.length === 0 ? (
                    <p className="text-xs text-zinc-400">
                      No names currently below pred_low at this win% floor.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {plan.long.candidates.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950/80 px-2.5 py-1 font-mono text-sm text-white"
                        >
                          {c.ticker}
                          <span className="text-[11px] text-sky-300">
                            {c.summaryScore.toFixed(0)}%
                          </span>
                          {c.overshootPct != null && Number.isFinite(c.overshootPct) && (
                            <span className="text-[11px] text-amber-300">
                              OS {c.overshootPct.toFixed(2)}%
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <SideTable
                title={
                  plan.source === 'model_reclaim_close'
                    ? 'Live long breach · Buy at close'
                    : 'Long · Buy shares'
                }
                side="long"
                plan={plan.long}
                source={plan.source}
                scoreLine={
                  isReclaimBuySource(plan.source)
                    ? (plan.min_win_pct_long ?? plan.min_win_pct ?? plan.score_line)
                    : plan.score_line
                }
                asOf={plan.ranks_as_of}
                selected={selected}
                onToggle={toggle}
                onChangeQuantity={changeQuantity}
              />
              {plan.source !== 'model_reclaim_close' && (
                <SideTable
                  title="Short · SellShort shares"
                  side="short"
                  plan={plan.short}
                  source={plan.source}
                  scoreLine={
                    plan.source === 'model_reclaim'
                      ? (plan.min_win_pct_short ?? STOCK_DT_RECLAIM_MIN_WIN_PCT_SHORT)
                      : plan.score_line
                  }
                  asOf={plan.ranks_as_of}
                  selected={selected}
                  onToggle={toggle}
                  onChangeQuantity={changeQuantity}
                />
              )}
              <p className="text-xs text-zinc-500 leading-relaxed">
                Paper trading only (sim-api). Not investment advice. Default is flat by close — use
                Flatten before the bell.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function StockDtPage() {
  return (
    <ProtectedRoute requireSubscription>
      <StockDtPageContent />
    </ProtectedRoute>
  )
}
