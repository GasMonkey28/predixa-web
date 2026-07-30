'use client'

import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { BarChart3, Layers } from 'lucide-react'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import MarketInsightTierStance from '@/components/trading/MarketInsightTierStance'
import MarketInsightModelSignals from '@/components/trading/MarketInsightModelSignals'
import {
  DEFAULT_EQUITY_TICKER,
  EQUITY_TICKERS,
  type EquityTicker,
} from '@/lib/tickers'

export const dynamic = 'force-dynamic'

function TickersPageContent() {
  const [ticker, setTicker] = useState<EquityTicker>(DEFAULT_EQUITY_TICKER)

  const subtitle = useMemo(
    () =>
      `${ticker}: 3mix letter tiers and Model 2 (y2y3) — same layout as the SPY Summary page.`,
    [ticker]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse" />
      <div className="relative mx-auto max-w-7xl p-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Tickers
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl">{subtitle}</p>
          </div>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Ticker
            </span>
            <select
              value={ticker}
              onChange={(e) => setTicker(e.target.value as EquityTicker)}
              className="min-w-[140px] rounded-xl border border-zinc-600/80 bg-zinc-900/90 px-3 py-2.5 text-sm font-semibold text-white shadow-lg outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
            >
              {EQUITY_TICKERS.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </label>
        </motion.div>

        <motion.div
          key={ticker}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-2 border-zinc-800/50 p-6 backdrop-blur-sm"
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">{ticker} insight</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Letter tiers from the 3mix ensemble, plus Model 2 y2y3 signals.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-zinc-700/60 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-blue-400 shrink-0" />
                <h3 className="text-sm font-medium text-zinc-200">
                  3mix letter tiers
                </h3>
              </div>
              <MarketInsightTierStance ticker={ticker} />
            </section>

            <section className="rounded-xl border border-zinc-700/60 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-400 shrink-0" />
                <h3 className="text-sm font-medium text-zinc-200">
                  Model 2 (y2y3)
                </h3>
              </div>
              <MarketInsightModelSignals ticker={ticker} showModel1={false} />
            </section>
          </div>

          <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-4 mt-5 leading-relaxed">
            For informational purposes only. Not investment advice. Equity pipelines publish
            under ticker-scoped S3 keys; SPY Summary remains unchanged.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function TickersPage() {
  return (
    <ProtectedRoute requireSubscription>
      <TickersPageContent />
    </ProtectedRoute>
  )
}
