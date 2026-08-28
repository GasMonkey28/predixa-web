'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import MarketInsightBlock from '@/components/trading/MarketInsightBlock'
import WeeklyPriceChartSection from '@/components/trading/WeeklyPriceChartSection'
import TradeJournalSummaryPanel from '@/components/trading/TradeJournalSummaryPanel'
import SpyBriefingPanel from '@/components/trading/SpyBriefingPanel'
import TodaysPlaybookPanel from '@/components/trading/TodaysPlaybookPanel'
import HorizonLinesChart from '@/app/moneyflow-horizon/HorizonLinesChart'

export const dynamic = 'force-dynamic'

function SummaryPageContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse" />
      <div className="relative mx-auto max-w-7xl p-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Market insight
          </h1>
          <p className="text-gray-300 text-lg">
            One-page read of today&apos;s tiers, model alignment, weekly context, and price action.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-2 border-blue-500/20 p-6 backdrop-blur-sm mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Today&apos;s play</h2>
            <Link
              href="/summary/playbook"
              className="text-xs text-blue-400 hover:text-blue-300 underline decoration-dotted"
            >
              Full rules &amp; methodology →
            </Link>
          </div>
          <TodaysPlaybookPanel />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left: insight + chart — same width, aligned with daily model1 column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-2 border-zinc-800/50 p-6 backdrop-blur-sm">
              <MarketInsightBlock />
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border-2 border-zinc-800/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">Money-flow horizon</h2>
                <Link
                  href="/moneyflow-horizon"
                  className="text-xs text-blue-400 hover:text-blue-300 underline decoration-dotted"
                >
                  Full forecast &amp; history →
                </Link>
              </div>
              <HorizonLinesChart />
            </div>
            <WeeklyPriceChartSection chartHeight={544} />
            <SpyBriefingPanel />
          </div>

          {/* Right: trade journal snapshot */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-zinc-800 p-6 flex-1 flex flex-col min-h-[320px] lg:min-h-0">
              <TradeJournalSummaryPanel />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function SummaryPage() {
  return (
    <ProtectedRoute requireSubscription>
      <SummaryPageContent />
    </ProtectedRoute>
  )
}
