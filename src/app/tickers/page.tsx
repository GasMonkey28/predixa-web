'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { fetchAuthSession } from 'aws-amplify/auth'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import type { TickerRankBoard, TickerRanksResponse } from '@/lib/ticker-ranks'

export const dynamic = 'force-dynamic'

function formatScore(score: number | undefined): string {
  if (score == null || !Number.isFinite(score)) return '—'
  return String(Math.trunc(score))
}

function formatHands(size: number | undefined): string {
  if (size == null || !Number.isFinite(size)) return '—'
  return size > 0 ? `+${size}` : String(size)
}

function formatDiff(diff: number | undefined): string {
  if (diff == null || !Number.isFinite(diff)) return '—'
  if (diff > 0) return `+${diff}`
  return String(diff)
}

const SUMMARY_TOTAL_LINE = 17

function RankBoardCard({ board }: { board: TickerRankBoard }) {
  const isMix = board.id.startsWith('mix3')
  const isSummary = board.id.startsWith('summary')
  const primaryLabel = board.id === 'mix3_long' ? 'Long' : board.id === 'mix3_short' ? 'Short' : null
  const otherLabel = board.id === 'mix3_long' ? 'Short' : board.id === 'mix3_short' ? 'Long' : null
  const mixScoreLabel = board.id === 'summary_long' ? 'R1 score' : 'R2 score'
  const handsOp = board.id === 'summary_long' ? '+' : '−'
  const colSpan = isMix ? 9 : isSummary ? 6 : 4

  return (
    <section
      className={`rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/85 to-zinc-950/90 overflow-hidden backdrop-blur-sm ${
        isMix ? 'lg:col-span-2' : ''
      }`}
    >
      <header className="border-b border-zinc-800/80 px-4 py-3">
        <h2 className="text-base font-semibold text-white">{board.title}</h2>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{board.description}</p>
      </header>

      <div className="max-h-[min(70vh,640px)] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-950/95 text-[11px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold w-12">#</th>
              <th className="px-3 py-2 text-left font-semibold">Ticker</th>
              {isMix ? (
                <>
                  <th className="px-3 py-2 text-left font-semibold">{primaryLabel}</th>
                  <th className="px-3 py-2 text-left font-semibold">{otherLabel}</th>
                  <th className="px-3 py-2 text-right font-semibold">Diff</th>
                  <th className="px-3 py-2 text-right font-semibold">Score</th>
                  <th className="px-3 py-2 text-left font-semibold min-w-[10rem]">Context</th>
                  <th className="px-3 py-2 text-left font-semibold">Risk</th>
                  <th className="px-3 py-2 text-left font-semibold">Conf</th>
                </>
              ) : isSummary ? (
                <>
                  <th className="px-3 py-2 text-right font-semibold">{mixScoreLabel}</th>
                  <th className="px-3 py-2 text-right font-semibold">Hands</th>
                  <th className="px-3 py-2 text-left font-semibold">Signal</th>
                  <th className="px-3 py-2 text-right font-semibold">Total ({handsOp})</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 text-left font-semibold">Signal</th>
                  <th className="px-3 py-2 text-right font-semibold">Hands</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {board.rows.map((row, index) => {
              const prev = index > 0 ? board.rows[index - 1] : null
              const showSummaryLine =
                isSummary &&
                prev != null &&
                (prev.score ?? Number.NEGATIVE_INFINITY) >= SUMMARY_TOTAL_LINE &&
                (row.score ?? Number.NEGATIVE_INFINITY) < SUMMARY_TOTAL_LINE

              return (
                <Fragment key={`${board.id}-${row.ticker}`}>
                  {showSummaryLine && (
                    <tr className="bg-amber-500/10">
                      <td colSpan={colSpan} className="px-3 py-1.5">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-amber-400/80" />
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300 whitespace-nowrap">
                            Total {SUMMARY_TOTAL_LINE} line
                          </span>
                          <div className="h-px flex-1 bg-amber-400/80" />
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-3 py-2 text-zinc-500 tabular-nums">{row.rank}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/tickers/insight?ticker=${row.ticker}`}
                        className="font-semibold text-blue-300 hover:text-blue-200"
                      >
                        {row.ticker}
                      </Link>
                    </td>
                    {isMix ? (
                      <>
                        <td className="px-3 py-2 font-medium text-zinc-100">{row.tier ?? '—'}</td>
                        <td className="px-3 py-2 font-medium text-zinc-400">{row.other_tier ?? '—'}</td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums font-medium ${
                            (row.tier_diff ?? 0) > 0
                              ? 'text-emerald-400'
                              : (row.tier_diff ?? 0) < 0
                                ? 'text-rose-400'
                                : 'text-zinc-400'
                          }`}
                        >
                          {formatDiff(row.tier_diff)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                          {formatScore(row.score)}
                        </td>
                        <td
                          className="px-3 py-2 text-[11px] text-indigo-200/90 leading-snug max-w-[14rem]"
                          title={row.market_context || undefined}
                        >
                          {row.market_context ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-yellow-200/90 whitespace-nowrap">
                          {row.risk ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-cyan-200 whitespace-nowrap">
                          {row.confidence ?? '—'}
                        </td>
                      </>
                    ) : isSummary ? (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                          {formatScore(row.mix_score)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums font-medium ${
                            (row.position_size ?? 0) > 0
                              ? 'text-emerald-400'
                              : (row.position_size ?? 0) < 0
                                ? 'text-rose-400'
                                : 'text-zinc-400'
                          }`}
                        >
                          {formatHands(row.position_size)}
                        </td>
                        <td className="px-3 py-2 capitalize text-zinc-400">
                          {(row.signal ?? '—').replace(/_/g, ' ')}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-white">
                          {formatScore(row.score)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 capitalize text-zinc-300">
                          {(row.signal ?? '—').replace(/_/g, ' ')}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums font-medium ${
                            (row.position_size ?? 0) > 0
                              ? 'text-emerald-400'
                              : (row.position_size ?? 0) < 0
                                ? 'text-rose-400'
                                : 'text-zinc-400'
                          }`}
                        >
                          {formatHands(row.position_size)}
                        </td>
                      </>
                    )}
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TickersRanksPageContent() {
  const [data, setData] = useState<TickerRanksResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const headers: HeadersInit = {}
        try {
          const session = await fetchAuthSession()
          const idToken = session.tokens?.idToken?.toString()
          if (idToken) headers.Authorization = `Bearer ${idToken}`
        } catch {
          // ProtectedRoute should already gate; API will 401 if still unauthenticated
        }
        const res = await fetch('/api/tickers/ranks', {
          cache: 'no-store',
          credentials: 'include',
          headers,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        const json = (await res.json()) as TickerRanksResponse
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load ranks')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse" />
      <div className="relative mx-auto max-w-7xl p-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Ticker ranks
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl">
              Cross-ticker leaderboards from today&apos;s 3mix letter tiers and Model 2 (y2y3)
              position size.
            </p>
          </div>
          <Link
            href="/tickers/insight"
            className="text-sm font-medium text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
          >
            Per-ticker insight →
          </Link>
        </motion.div>

        {loading && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 px-6 py-16 text-center text-zinc-300">
            Ranking {data?.ticker_count ?? 'all'} tickers…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 px-6 py-10 text-center text-rose-200">
            {error}
          </div>
        )}

        {data && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-xs text-zinc-500">
              {data.ticker_count} tickers · generated{' '}
              {new Date(data.generated_at).toLocaleString()}
              {data.errors?.length
                ? ` · ${data.errors.length} feeder warning${data.errors.length === 1 ? '' : 's'}`
                : ''}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.boards.map((board) => (
                <RankBoardCard key={board.id} board={board} />
              ))}
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed pt-2">
              For informational purposes only. Not investment advice. Ranks are derived server-side
              from published S3 feeders (no recompute of model scores).
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function TickersRanksPage() {
  return (
    <ProtectedRoute requireSubscription>
      <TickersRanksPageContent />
    </ProtectedRoute>
  )
}
