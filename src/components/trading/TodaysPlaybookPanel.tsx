'use client'

import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus, ShieldCheck, ShieldX } from 'lucide-react'

import SessionDateBadge from '@/components/trading/SessionDateBadge'
import type { Direction, MarketInsightFacts } from '@/lib/server/market-insight-types'

// Mirrors the backtested y2y3 sizing/target/stop rules from the MES strategy
// playbook. Direction and size come straight from production's own step5
// thresholds (final_signal / position_size); only target/stop are derived
// here, client-side, from the raw predictions production already serves.
const Y2Y3_STOP_MULT = 0.5

interface Model2Raw {
  date?: string
  final_signal?: string
  position_size?: number
  y1_signal?: string
  y2y3_signal?: string
  pred_y1?: number
  pred_y2?: number
  pred_y3?: number
  open_price?: number
}

interface Model2ApiData {
  today?: Model2Raw
  trading_days?: Array<Record<string, unknown>>
}

function extractToday(data: Model2ApiData): Model2Raw | null {
  if (data.today?.final_signal) return data.today
  const days = data.trading_days
  if (!days?.length) return null
  const last = days[days.length - 1] as Record<string, unknown>
  if (!last.as_of_date) return null
  return {
    date: String(last.as_of_date),
    final_signal: String(last.final_signal ?? 'no_trade'),
    position_size: Number(last.position_size ?? 0),
    y1_signal: String(last.y1_signal ?? 'no_trade'),
    y2y3_signal: String(last.y2y3_signal ?? 'no_trade'),
    pred_y1: Number(last.pred_y1 ?? NaN),
    pred_y2: Number(last.pred_y2 ?? NaN),
    pred_y3: Number(last.pred_y3 ?? NaN),
    open_price: Number(last.open_price ?? NaN),
  }
}

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `$${n.toFixed(2)}`
}

function DirIcon({ dir }: { dir: Direction | null }) {
  if (dir === 'up') return <ArrowUpRight className="w-4 h-4 text-emerald-400" />
  if (dir === 'down') return <ArrowDownRight className="w-4 h-4 text-rose-400" />
  return <Minus className="w-4 h-4 text-zinc-500" />
}

function dirLabel(dir: Direction | null): string {
  if (dir === 'up') return 'LONG'
  if (dir === 'down') return 'SHORT'
  return 'FLAT'
}

function rowBorder(dir: Direction | null): string {
  if (dir === 'up') return 'border-emerald-500/25 bg-emerald-950/10'
  if (dir === 'down') return 'border-rose-500/25 bg-rose-950/10'
  return 'border-zinc-700/50 bg-zinc-900/30'
}

/**
 * Today's live 3-layer readout: Layer 1 (Horizon, per-leg size/target/stop),
 * Layer 2 (y2y3, production's own signal + derived target/stop), Layer 3
 * (RateTiers bias). Ends in a plain take-it / skip-it verdict from the same
 * agree-or-neutral filter rule validated in the backtest.
 */
export default function TodaysPlaybookPanel({ compact = false }: { compact?: boolean }) {
  const [facts, setFacts] = useState<MarketInsightFacts | null>(null)
  const [model2, setModel2] = useState<Model2ApiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [insightRes, model2Res] = await Promise.all([
          fetch('/api/market-insight/daily').then((r) => r.json()),
          fetch(`/api/model2/daily?t=${Date.now()}`).then((r) => r.json()),
        ])
        if (!cancelled) {
          setFacts(insightRes?.facts ?? null)
          setModel2(model2Res ?? null)
        }
      } catch {
        if (!cancelled) {
          setFacts(null)
          setModel2(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-16 bg-zinc-700/50 rounded-lg" />
        <div className="h-16 bg-zinc-700/50 rounded-lg" />
        <div className="h-16 bg-zinc-700/50 rounded-lg" />
      </div>
    )
  }

  const horizon = facts?.horizon ?? null
  const tiers = facts?.tiers ?? null
  const y2y3Today = model2 ? extractToday(model2) : null

  const hasAny = horizon || tiers || y2y3Today
  if (!hasAny) {
    return (
      <p className="text-sm text-zinc-400 leading-relaxed">
        Today&apos;s playbook isn&apos;t available yet — check back after this morning&apos;s model run.
      </p>
    )
  }

  // y2y3 target/stop, derived client-side from production's raw predictions
  let y2y3Direction: Direction | null = null
  let y2y3Target: number | null = null
  let y2y3Stop: number | null = null
  if (y2y3Today) {
    const sig = y2y3Today.final_signal
    if (sig === 'long') y2y3Direction = 'up'
    else if (sig === 'short') y2y3Direction = 'down'
    const { open_price: open, pred_y2, pred_y3, pred_y1 } = y2y3Today
    if (open != null && Number.isFinite(open) && pred_y2 != null && pred_y3 != null && Number.isFinite(pred_y2) && Number.isFinite(pred_y3)) {
      const band = Math.abs(pred_y2 - pred_y3) || 0.5
      if (y2y3Direction === 'up') {
        const move = pred_y1 != null && Number.isFinite(pred_y1) && pred_y1 > 0 ? pred_y1 : Math.max(0.1, 0.25 * band)
        y2y3Target = open + move
        y2y3Stop = open - Y2Y3_STOP_MULT * band
      } else if (y2y3Direction === 'down') {
        const move = pred_y1 != null && Number.isFinite(pred_y1) && pred_y1 < 0 ? pred_y1 : -Math.max(0.1, 0.25 * band)
        y2y3Target = open + move
        y2y3Stop = open + Y2Y3_STOP_MULT * band
      }
    }
  }

  const tierDir: Direction | null =
    tiers?.bias === 'long' ? 'up' : tiers?.bias === 'short' ? 'down' : null

  // Same agree-or-neutral filter validated in the backtest: horizon's own
  // legs need y2y3 and RateTiers to either agree or have no strong opinion.
  const layerDirs: Direction[] = []
  if (y2y3Direction) layerDirs.push(y2y3Direction)
  if (tierDir) layerDirs.push(tierDir)
  function legVerdict(legDir: Direction): boolean {
    return layerDirs.every((d) => d === legDir)
  }

  return (
    <div className="space-y-3">
      {y2y3Today?.date && <SessionDateBadge date={y2y3Today.date} />}

      {/* Layer 1 — Horizon */}
      {horizon && horizon.legs.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-teal-400">
            Layer 1 &middot; Horizon
          </div>
          {horizon.legs.map((leg) => {
            const cleared = leg.contracts > 0 && legVerdict(leg.direction)
            return (
              <div
                key={leg.horizon}
                className={`rounded-lg border p-2.5 flex items-center justify-between gap-3 ${rowBorder(leg.direction)}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <DirIcon dir={leg.direction} />
                  <div>
                    <div className="text-xs font-bold text-white">
                      {leg.horizon} &middot; {dirLabel(leg.direction)}
                    </div>
                    {!compact && (
                      <div className="text-[10px] text-zinc-400 font-mono">
                        target {money(leg.target_price)} &middot; stop {money(leg.stop_price)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-zinc-500">{leg.tier_label}</span>
                  <span className="text-sm font-mono font-bold text-white">{leg.contracts}</span>
                  {leg.contracts > 0 &&
                    (cleared ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-label="Cleared filters" />
                    ) : (
                      <ShieldX className="w-3.5 h-3.5 text-zinc-500" aria-label="Blocked by a filter" />
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Layer 2 — y2y3 */}
      {y2y3Today && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
            Layer 2 &middot; y2y3
          </div>
          <div className={`rounded-lg border p-2.5 flex items-center justify-between gap-3 ${rowBorder(y2y3Direction)}`}>
            <div className="flex items-center gap-2 min-w-0">
              <DirIcon dir={y2y3Direction} />
              <div>
                <div className="text-xs font-bold text-white">
                  {y2y3Today.final_signal?.replace(/_/g, ' ').toUpperCase() ?? 'NO TRADE'}
                </div>
                {!compact && (y2y3Target != null || y2y3Stop != null) && (
                  <div className="text-[10px] text-zinc-400 font-mono">
                    target {money(y2y3Target)} &middot; stop {money(y2y3Stop)}
                  </div>
                )}
              </div>
            </div>
            <span className="text-sm font-mono font-bold text-white">
              {y2y3Today.position_size ?? 0}
            </span>
          </div>
        </div>
      )}

      {/* Layer 3 — RateTiers */}
      {tiers && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-purple-400">
            Layer 3 &middot; RateTiers
          </div>
          <div className={`rounded-lg border p-2.5 flex items-center justify-between gap-3 ${rowBorder(tierDir)}`}>
            <div className="flex items-center gap-2 min-w-0">
              <DirIcon dir={tierDir} />
              <div>
                <div className="text-xs font-bold text-white">
                  {tiers.bias.replace(/_/g, ' ').toUpperCase()}
                </div>
                {!compact && (
                  <div className="text-[10px] text-zinc-400">
                    long {tiers.long_tier} &middot; short {tiers.short_tier}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <p className="text-[10px] text-zinc-500 leading-relaxed pt-1">
          Sizing and target/stop for Layer 1 &amp; 2 are computed live from today&apos;s own
          predictions using the backtested playbook rules — see the{' '}
          <span className="text-zinc-400 underline decoration-dotted">Playbook</span> page for the
          full methodology and its caveats.
        </p>
      )}
    </div>
  )
}
