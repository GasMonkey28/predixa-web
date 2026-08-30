'use client'

import { useEffect, useState } from 'react'

// Phase 1: display only. Shows the dealer-gamma regime from /api/gex next to the
// Money-Flow Horizon readout. The "would size at" line is advisory — nothing in
// the app changes position size yet.

type GexApi = {
  status?: string
  as_of_date?: string | null
  regime?: 'positive' | 'negative' | null
  gex_ratio?: number | null
  advisory_size_mult?: number | null
  suspect?: boolean
  stale?: boolean
}

function fmtDate(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function GexRegimeBadge({ className = '' }: { className?: string }) {
  const [data, setData] = useState<GexApi | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/gex')
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ status: 'missing' }))
    return () => {
      cancelled = true
    }
  }, [])

  // Render nothing until we have a usable, non-suspect record.
  if (!data || data.status !== 'ok' || !data.regime || data.suspect) return null

  const { regime, gex_ratio, advisory_size_mult, as_of_date, stale } = data

  if (stale) {
    return (
      <div
        className={`flex items-center gap-2 rounded-none border-l-2 border-zinc-600 bg-zinc-800/40 px-3 py-2 font-mono text-xs text-zinc-500 ${className}`}
      >
        <span className="uppercase tracking-wide">Dealer gamma</span>
        <span>last read {fmtDate(as_of_date)}</span>
      </div>
    )
  }

  const pos = regime === 'positive'
  const accent = pos ? 'border-teal-500' : 'border-orange-500'
  const chip = pos
    ? 'bg-teal-500/15 text-teal-300'
    : 'bg-orange-500/15 text-orange-300'
  const ratioTxt =
    typeof gex_ratio === 'number'
      ? `${gex_ratio >= 0 ? '+' : ''}${gex_ratio.toFixed(2)}`
      : '—'
  const sizePct =
    typeof advisory_size_mult === 'number' ? `${Math.round(advisory_size_mult * 100)}%` : '—'

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-none border-l-2 ${accent} bg-zinc-800/40 px-3 py-2 text-xs ${className}`}
    >
      <span className="font-mono uppercase tracking-wide text-zinc-500">Dealer gamma</span>
      <span className={`rounded px-1.5 py-0.5 font-mono font-medium ${chip}`}>
        {regime} regime
      </span>
      <span className="font-mono text-zinc-400">ratio {ratioTxt}</span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-400">
        would size Layer&nbsp;1 at <span className={pos ? 'text-teal-300' : 'text-orange-300'}>{sizePct}</span>
      </span>
      <span className="ml-auto font-mono text-[10px] text-zinc-600">as of {fmtDate(as_of_date)}</span>
    </div>
  )
}
