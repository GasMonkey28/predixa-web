'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { fetchAuthSession } from 'aws-amplify/auth'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DtMarketQuotesBoard, {
  DtTickerPriceHint,
} from '@/components/dt/DtMarketQuotesBoard'
import DtPnlCalendar from '@/components/dt/DtPnlCalendar'
import OptionDtPositionsPanel, {
  type OptionDtOpenPosition,
} from '@/components/option-dt/OptionDtPositionsPanel'
import { useAuthStore } from '@/lib/auth-store'
import { readDtSimAccountId, writeDtSimAccountId } from '@/lib/dt-account'
import type { DtFlattenUndoLot } from '@/lib/dt-flatten-undo'
import type { DtPnlSnapshot } from '@/lib/dt-pnl-types'
import {
  OPTION_DT_LOOSE_FILTERS,
  OPTION_DT_PREMIUM_LABEL,
  OPTION_DT_SCORE_LINE,
  OPTION_DT_SIDE_BUDGET,
  type OptionDtCandidate,
  type OptionDtPlanResponse,
  type OptionDtSide,
} from '@/lib/option-dt'

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
  selected,
  onToggle,
  onChangeContract,
  onChangeExpiration,
  onChangeDte,
  onChangeQuantity,
}: {
  title: string
  side: OptionDtSide
  plan: OptionDtPlanResponse['long'] | undefined
  selected: Set<string>
  onToggle: (id: string) => void
  onChangeContract: (candidateId: string, optionSymbol: string) => void
  onChangeExpiration: (candidateId: string, expiration: string) => void
  onChangeDte: (candidateId: string, dte: number) => void
  onChangeQuantity: (candidateId: string, quantity: number) => void
}) {
  if (!plan) return null

  const overSuggested = plan.spent > plan.budget

  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/85 to-zinc-950/90 overflow-hidden">
      <header className="border-b border-zinc-800/80 px-4 py-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Summary total ≥ {OPTION_DT_SCORE_LINE} · {side === 'long' ? 'calls' : 'puts'} ·{' '}
            {OPTION_DT_LOOSE_FILTERS
              ? 'loose filters (any strike / exp / premium)'
              : `${OPTION_DT_PREMIUM_LABEL} · ITM + OTM · avoid 0DTE when possible`}
          </p>
        </div>
        <div className="text-xs text-zinc-400 text-right">
          <div className={overSuggested ? 'text-amber-300' : undefined}>
            Est. {money(plan.spent)}
            <span className="text-zinc-500"> · suggested start {money(plan.budget)}</span>
          </div>
          <div className="text-zinc-500">$500 guides initial qty only — not a buy cap</div>
        </div>
      </header>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-950/95 text-[11px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">OK</th>
              <th className="px-3 py-2 text-left">Ticker</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-left">Exp</th>
              <th className="px-3 py-2 text-left">Strike</th>
              <th className="px-3 py-2 text-right">DTE</th>
              <th className="px-3 py-2 text-right">Ask</th>
              <th className="px-3 py-2 text-right">OI</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {plan.candidates.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">
                  No tradeable contracts above the {OPTION_DT_SCORE_LINE} line for this side.
                </td>
              </tr>
            )}
            {plan.candidates.map((row) => {
              const checked = selected.has(row.id)
              const alts = row.alternatives ?? []
              const expirations = Array.from(
                new Map(
                  alts.map((a) => [
                    a.expiration,
                    { expiration: a.expiration, dte: a.dteTradingDays },
                  ])
                ).values()
              ).sort((a, b) => a.dte - b.dte || a.expiration.localeCompare(b.expiration))
              const dteOptions = Array.from(
                new Set([row.dteTradingDays, ...alts.map((a) => a.dteTradingDays)])
              ).sort((a, b) => a - b)
              const strikesForExp = alts
                .filter((a) => a.expiration === row.expiration)
                .sort((a, b) => a.strike - b.strike)
              let strikeOptions = strikesForExp.length > 0 ? [...strikesForExp] : [...alts]
              // Select value must include the recommended contract (label below), or the
              // browser falls back to the first option and looks desynced.
              if (
                row.optionSymbol &&
                !strikeOptions.some((a) => a.optionSymbol === row.optionSymbol)
              ) {
                strikeOptions.push({
                  optionSymbol: row.optionSymbol,
                  strike: row.strike,
                  expiration: row.expiration,
                  dteTradingDays: row.dteTradingDays,
                  bid: row.bid,
                  ask: row.ask,
                  mid: row.mid,
                  openInterest: row.openInterest,
                  costPerContract: row.costPerContract,
                  label: `$${row.strike}`,
                })
                strikeOptions.sort((a, b) => a.strike - b.strike)
              }
              if (
                row.expiration &&
                !expirations.some((e) => e.expiration === row.expiration)
              ) {
                expirations.push({
                  expiration: row.expiration,
                  dte: row.dteTradingDays,
                })
                expirations.sort(
                  (a, b) => a.dte - b.dte || a.expiration.localeCompare(b.expiration)
                )
              }

              return (
                <tr
                  key={row.id}
                  className={`border-t border-zinc-800/50 ${checked ? 'bg-emerald-500/5' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(row.id)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-white">
                    <Link
                      href={`/tickers/insight?ticker=${row.ticker}`}
                      className="text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
                    >
                      {row.ticker}
                    </Link>
                    <DtTickerPriceHint
                      last={row.underlyingLast}
                      netChange={row.netChange}
                      netChangePct={row.netChangePct}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-amber-200">{row.summaryScore}</td>
                  <td className="px-3 py-2 text-zinc-300 min-w-[8.5rem]">
                    {expirations.length > 0 ? (
                      <select
                        value={row.expiration}
                        onChange={(e) => onChangeExpiration(row.id, e.target.value)}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-[11px] text-zinc-200 focus:border-emerald-500/60 focus:outline-none"
                        title="Expiration date"
                      >
                        {expirations.map((e) => (
                          <option key={e.expiration} value={e.expiration}>
                            {e.expiration}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-mono text-xs">{row.expiration}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-300 min-w-[10rem]">
                    {strikeOptions.length > 0 ? (
                      <select
                        value={row.optionSymbol}
                        onChange={(e) => onChangeContract(row.id, e.target.value)}
                        className="w-full max-w-[14rem] rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-[11px] text-zinc-200 focus:border-emerald-500/60 focus:outline-none"
                        title="Strike"
                      >
                        {strikeOptions.map((a) => (
                          <option key={a.optionSymbol} value={a.optionSymbol}>
                            {a.label.includes('★') ? '★ ' : ''}${a.strike}
                            {a.label.includes('ITM')
                              ? ' ITM'
                              : a.label.includes('ATM')
                                ? ' ATM'
                                : ' OTM'}
                            {a.costPerContract > 0 ? ` · $${a.costPerContract.toFixed(0)}` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-mono text-xs">{row.strike}</span>
                    )}
                    <div className="mt-1 text-[11px] text-zinc-500 truncate max-w-[14rem]">
                      {row.optionSymbol}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {dteOptions.length > 0 ? (
                      <select
                        value={row.dteTradingDays}
                        onChange={(e) => onChangeDte(row.id, Number(e.target.value))}
                        className="w-16 rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1.5 text-right font-mono text-[11px] text-zinc-200 focus:border-emerald-500/60 focus:outline-none"
                        title="Days to expiration"
                      >
                        {dteOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}d
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-zinc-300">{row.dteTradingDays}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">{money(row.ask)}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{row.openInterest}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      step={1}
                      value={row.quantity}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        if (!Number.isFinite(n)) return
                        onChangeQuantity(row.id, n)
                      }}
                      className="w-16 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-right text-white focus:border-emerald-500/60 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-300">{money(row.estimatedCost)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {plan.skipped.length > 0 && (
        <div className="border-t border-zinc-800/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Skipped</p>
          <ul className="space-y-1 text-xs text-zinc-400">
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

function OptionDtPageContent() {
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
  const [plan, setPlan] = useState<OptionDtPlanResponse | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [flattening, setFlattening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placeResult, setPlaceResult] = useState<string | null>(null)
  const [positions, setPositions] = useState<OptionDtOpenPosition[]>([])
  const [positionTotals, setPositionTotals] = useState({
    marketValue: 0,
    totalCost: 0,
    unrealizedPnl: 0,
    contracts: 0,
  })
  const [positionsLoading, setPositionsLoading] = useState(false)
  const [busySymbol, setBusySymbol] = useState<string | null>(null)
  const [busyDay, setBusyDay] = useState<string | null>(null)
  const [flattenUndo, setFlattenUndo] = useState<DtFlattenUndoLot[] | null>(null)
  const [undoing, setUndoing] = useState(false)
  const [pnlSnapshot, setPnlSnapshot] = useState<DtPnlSnapshot | null>(null)
  const [pnlLoading, setPnlLoading] = useState(false)

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
      setPositionTotals({ marketValue: 0, totalCost: 0, unrealizedPnl: 0, contracts: 0 })
      return
    }
    setPositionsLoading(true)
    try {
      const res = await fetch(
        `/api/option-dt/positions?accountId=${encodeURIComponent(accountId)}`,
        {
          headers: await authHeaders(),
          credentials: 'include',
          cache: 'no-store',
        }
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setPositions((body.positions as OptionDtOpenPosition[]) || [])
      setPositionTotals(
        body.totals || { marketValue: 0, totalCost: 0, unrealizedPnl: 0, contracts: 0 }
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
        `/api/option-dt/pnl?accountId=${encodeURIComponent(accountId)}`,
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
    if (ts === 'connected') setTsMessage('TradeStation connected. Pick your paper account, then load candidates.')
    else if (ts === 'denied') setTsMessage('TradeStation authorization was declined.')
    else if (ts === 'not_configured') {
      setTsMessage(
        'This server is missing TRADESTATION_CLIENT_ID / SECRET. On localhost, copy them from Vercel into .env.local and restart next — or reconnect on the deployed Predixa site.'
      )
      setServerConfigured(false)
    } else if (ts === 'signin') setTsMessage('Sign in to Predixa first, then reconnect TradeStation.')
    else setTsMessage('TradeStation connection failed. Check callback URL / Vercel keys.')
    params.delete('ts')
    window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`)
    void refreshTs()
  }, [refreshTs])

  const allCandidates = useMemo(() => {
    if (!plan) return [] as OptionDtCandidate[]
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
      const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : ''
      const res = await fetch(`/api/option-dt/candidates${qs}`, {
        headers: await authHeaders(),
        credentials: 'include',
        cache: 'no-store',
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      const next = body as OptionDtPlanResponse
      setPlan(next)
      setSelected(new Set([...next.long.candidates, ...next.short.candidates].map((c) => c.id)))
    } catch (err) {
      setPlan(null)
      setError(err instanceof Error ? err.message : 'Failed to load candidates')
    } finally {
      setLoadingPlan(false)
    }
  }, [accountId, tsConnected])

  // Auto-load candidates when connected + paper account ready.
  useEffect(() => {
    if (!tsConnected || !accountId || !tradeScopesOk) return
    void loadPlan()
  }, [tsConnected, accountId, tradeScopesOk, loadPlan])

  // Refresh candidates when returning to the tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && tsConnected && accountId && tradeScopesOk) {
        void loadPlan()
        void loadPositions()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [tsConnected, accountId, tradeScopesOk, loadPlan, loadPositions])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const patchCandidate = (
    candidateId: string,
    patch: (row: OptionDtCandidate) => OptionDtCandidate | null
  ) => {
    setPlan((prev) => {
      if (!prev) return prev
      const sideKey = candidateId.startsWith('long:') ? 'long' : 'short'
      const sidePlan = prev[sideKey]
      const idx = sidePlan.candidates.findIndex((c) => c.id === candidateId)
      if (idx < 0) return prev
      const updated = patch(sidePlan.candidates[idx])
      if (!updated) return prev
      const candidates = sidePlan.candidates.map((c, i) => (i === idx ? updated : c))
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

  const applyChoice = (
    row: OptionDtCandidate,
    choice: NonNullable<OptionDtCandidate['alternatives']>[number],
    quantity = row.quantity
  ): OptionDtCandidate => {
    const qty = Math.max(0, Math.min(99, Number.isFinite(quantity) ? Math.floor(quantity) : 0))
    const costPer = choice.costPerContract
    return {
      ...row,
      optionSymbol: choice.optionSymbol,
      strike: choice.strike,
      expiration: choice.expiration,
      expirationLabel: choice.expiration,
      dteTradingDays: choice.dteTradingDays,
      bid: choice.bid,
      ask: choice.ask,
      mid: choice.mid,
      openInterest: choice.openInterest,
      costPerContract: costPer,
      quantity: qty,
      estimatedCost: Math.round(qty * costPer * 100) / 100,
      reason: `Picked · ~$${costPer.toFixed(0)}/ct`,
    }
  }

  const pickOnExpiration = (
    row: OptionDtCandidate,
    expiration: string
  ): OptionDtCandidate | null => {
    const alts = row.alternatives ?? []
    const onExp = alts.filter((a) => a.expiration === expiration)
    if (onExp.length === 0) return null
    const sameStrike = onExp.find((a) => a.strike === row.strike)
    const preferred = onExp
      .filter((a) => a.costPerContract >= 20 && a.costPerContract <= 300)
      .sort((a, b) => Math.abs(a.strike - row.strike) - Math.abs(b.strike - row.strike))
    const nearest = [...onExp].sort(
      (a, b) => Math.abs(a.strike - row.strike) - Math.abs(b.strike - row.strike)
    )[0]
    const choice = sameStrike ?? preferred[0] ?? nearest
    return applyChoice(row, choice, row.quantity)
  }

  const changeContract = (candidateId: string, optionSymbol: string) => {
    patchCandidate(candidateId, (row) => {
      if (row.optionSymbol === optionSymbol) return null
      const choice = row.alternatives?.find((a) => a.optionSymbol === optionSymbol)
      if (!choice) return null
      return applyChoice(row, choice, row.quantity)
    })
  }

  const changeExpiration = (candidateId: string, expiration: string) => {
    patchCandidate(candidateId, (row) => {
      if (row.expiration === expiration) return null
      return pickOnExpiration(row, expiration)
    })
  }

  const changeDte = (candidateId: string, dte: number) => {
    patchCandidate(candidateId, (row) => {
      if (row.dteTradingDays === dte) return null
      const alts = row.alternatives ?? []
      const match = alts.find((a) => a.dteTradingDays === dte)
      if (!match) return null
      return pickOnExpiration(row, match.expiration)
    })
  }

  const changeQuantity = (candidateId: string, quantity: number) => {
    patchCandidate(candidateId, (row) => {
      const qty = Math.max(0, Math.min(99, Number.isFinite(quantity) ? Math.floor(quantity) : 0))
      if (qty === row.quantity) return null
      return {
        ...row,
        quantity: qty,
        estimatedCost: Math.round(qty * row.costPerContract * 100) / 100,
      }
    })
  }

  const confirmAndPlace = async () => {
    if (placeableCandidates.length === 0) return
    const ok = window.confirm(
      `Place ${placeableCandidates.length} paper BuyToOpen order(s) on account ${accountId}?\n` +
        `Est. debit ~${money(selectedCost)}\n\n` +
        `Remember to Flatten before close.`
    )
    if (!ok) return

    setPlacing(true)
    setPlaceResult(null)
    setError(null)
    try {
      const res = await fetch('/api/option-dt/place', {
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
      setPlaceResult(
        `Placed ${body.placed}, failed ${body.failed}. ${body.note || ''}`.trim()
      )
      void loadPositions()
      void loadPnl()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Place failed')
    } finally {
      setPlacing(false)
    }
  }

  const flatten = async () => {
    if (!accountId) return
    const ok = window.confirm(
      `Sell-to-close all option positions on paper account ${accountId}?`
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
      const res = await fetch('/api/option-dt/flatten', {
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
        ? `Buy +${qty} ${symbol}`
        : action === 'sell_one'
          ? `Sell −${qty} ${symbol}`
          : `Flatten ${symbol}`
    if (!window.confirm(`${label} on paper account ${accountId}?`)) return

    const prior = action === 'flatten' ? positions.find((p) => p.symbol === symbol) : null

    setBusySymbol(symbol)
    setError(null)
    try {
      const res = await fetch('/api/option-dt/adjust', {
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
          ? `Bought +${qty} ${symbol} (order ${body.orderId}).`
          : action === 'sell_one'
            ? `Sold −${qty} ${symbol} (order ${body.orderId}).`
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
        `Flatten ${symbols.length} option position(s) from ${day} on paper account ${accountId}?`
      )
    ) {
      return
    }

    const symbolSet = new Set(symbols)
    const snapshot: DtFlattenUndoLot[] = positions
      .filter((p) => symbolSet.has(p.symbol))
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
          const res = await fetch('/api/option-dt/adjust', {
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
        `Undo flatten — re-open ${flattenUndo.length} option position(s) at market on ${accountId}?`
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
          const res = await fetch('/api/option-dt/adjust', {
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
              Option DT
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl">
              Paper day-trades from Summary Long/Short ranks above the {OPTION_DT_SCORE_LINE} line.
              {OPTION_DT_LOOSE_FILTERS
                ? ' Loose filters ON (no premium / OTM / DTE caps) for testing.'
                : ` ITM + OTM, ${OPTION_DT_PREMIUM_LABEL}, 0–5 trading-day DTE.`}{' '}
              Suggested start ~{money(OPTION_DT_SIDE_BUDGET)} per side (not a buy cap). Confirm
              before send. Flat by close.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
            <Link
              href="/stock-dt"
              className="font-medium text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
            >
              ← Stock DT
            </Link>
            <Link
              href="/tickers"
              className="font-medium text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
            >
              ← Ticker ranks
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
                  tradeScopesOk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'
                }`}
              >
                {tradeScopesOk ? 'Trade scopes OK' : 'Reconnect for Trade + MarketData'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <a
              href="/api/tradestation/connect?returnTo=/option-dt"
              className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2"
            >
              {tsConnected ? 'Reconnect TradeStation' : 'Connect TradeStation'}
            </a>
            <select
              value={simAccounts.some((a) => a.id === accountId) ? accountId : ''}
              onChange={(e) => {
                const id = e.target.value
                setAccountId(id)
                setManualAccountId(id)
                if (id) writeDtSimAccountId(id)
              }}
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
                setAccountId(id)
                setManualAccountId(id)
                writeDtSimAccountId(id)
                setTsMessage(`Using paper account ${id}`)
              }}
              className="rounded-lg border border-zinc-600 text-zinc-200 hover:bg-zinc-800 text-sm font-medium px-3 py-2"
            >
              Use account
            </button>
            <button
              type="button"
              onClick={() => void loadPlan()}
              disabled={loadingPlan || !tsConnected}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-2"
            >
              {loadingPlan ? 'Loading chains…' : 'Reload candidates'}
            </button>
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
              {flattening ? 'Flattening…' : 'Flatten options'}
            </button>
          </div>

          {accountId && (
            <p className="text-xs text-zinc-400">
              Active paper account: <span className="font-mono text-emerald-300">{accountId}</span>
              <span className="text-zinc-500"> (shared with Stock DT)</span>
            </p>
          )}

          {!serverConfigured && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-3 space-y-2 text-xs text-rose-100 leading-relaxed">
              <p className="font-medium text-rose-200">
                Server missing TradeStation API keys (this is why Reconnect shows an error).
              </p>
              <p>
                Your Vercel Production/Preview vars are fine for the live site. Localhost needs the same
                three values in <span className="font-mono text-white">.env.local</span>, then restart
                Next:
              </p>
              <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-rose-100/90">
                <li>TRADESTATION_CLIENT_ID</li>
                <li>TRADESTATION_CLIENT_SECRET</li>
                <li>TRADESTATION_REDIRECT_URI (http://localhost:3000/api/tradestation/callback)</li>
              </ul>
              <p>
                Or open Option DT on your deployed Predixa URL and reconnect there. No new Client ID is
                needed for sim — same Auth0 key, different base URL.
              </p>
            </div>
          )}

          {simAccounts.length === 0 && tsConnected && serverConfigured && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 space-y-2 text-xs text-amber-100/95 leading-relaxed">
              <p className="font-medium text-amber-200">
                Connected, but sim account list is empty. You can paste your SIM account (e.g. SIM1847602F)
                above and click Use account.
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
              <p>
                Only contact TradeStation if reconnect works with keys present and sim-api still fails —
                ask them to confirm sim-api access for your Auth0 API key. You do <span className="text-white">not</span> need a
                separate Client ID for paper.
              </p>
            </div>
          )}

          {simAccounts.length === 0 && tsConnected && !serverConfigured && simError && (
            <p className="text-xs text-amber-200/90 font-mono break-words">{simError}</p>
          )}
          {tsMessage && <p className="text-xs text-blue-200">{tsMessage}</p>}
          {plan?.warnings?.map((w) => (
            <p key={w} className="text-xs text-amber-200">
              {w}
            </p>
          ))}
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {placeResult && <p className="text-sm text-emerald-300">{placeResult}</p>}
          {plan && (
            <p className="text-xs text-zinc-500">
              Ranks as of {plan.ranks_as_of || '—'} · plan {new Date(plan.generated_at).toLocaleString()}{' '}
              · selected est. {money(selectedCost)}
            </p>
          )}
        </section>

        {tsConnected && accountId && (
          <OptionDtPositionsPanel
            positions={positions}
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
            assetLabel="Option"
            snapshot={pnlSnapshot}
            loading={pnlLoading}
            onRefresh={() => void loadPnl()}
          />
        )}

        {loadingPlan && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 px-6 py-16 text-center text-zinc-300">
            Pulling ranks ≥ {OPTION_DT_SCORE_LINE} and option chains…
          </div>
        )}

        {plan && !loadingPlan && (
          <>
            <DtMarketQuotesBoard market={plan.market} scoreLine={OPTION_DT_SCORE_LINE} />
            <div className="grid grid-cols-1 gap-4">
              <SideTable
                title="Long · buy calls"
                side="long"
                plan={plan.long}
                selected={selected}
                onToggle={toggle}
                onChangeContract={changeContract}
                onChangeExpiration={changeExpiration}
                onChangeDte={changeDte}
                onChangeQuantity={changeQuantity}
              />
              <SideTable
                title="Short · buy puts"
                side="short"
                plan={plan.short}
                selected={selected}
                onToggle={toggle}
                onChangeContract={changeContract}
                onChangeExpiration={changeExpiration}
                onChangeDte={changeDte}
                onChangeQuantity={changeQuantity}
              />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Paper trading only (sim-api). Not investment advice. Default is flat by close — use
                Flatten before the bell (auto EOD flatten can come later).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function OptionDtPage() {
  return (
    <ProtectedRoute requireSubscription>
      <OptionDtPageContent />
    </ProtectedRoute>
  )
}
