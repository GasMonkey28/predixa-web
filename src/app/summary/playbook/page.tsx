import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { createMetadata } from '@/lib/seo'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import TodaysPlaybookPanel from '@/components/trading/TodaysPlaybookPanel'

export const metadata: Metadata = createMetadata({
  title: 'Trading Playbook | Predixa',
  description:
    "Today's three-layer trading playbook — Horizon model, y2y3, and RateTiers combined into one entry/exit/sizing readout, plus the backtested rules behind it.",
  path: '/summary/playbook',
})

function RuleRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-2.5 border-t border-zinc-800/70 first:border-t-0">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 sm:w-36 shrink-0">{label}</div>
      <div className="text-sm text-zinc-200 leading-relaxed">{value}</div>
    </div>
  )
}

function LayerCard({
  tag,
  tagColor,
  title,
  role,
  children,
}: {
  tag: string
  tagColor: string
  title: string
  role: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border-2 border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-3">
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ color: tagColor, backgroundColor: `${tagColor}1a` }}
          >
            {tag}
          </span>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <span className="text-xs text-zinc-500">{role}</span>
      </div>
      {children}
    </div>
  )
}

function PlaybookPageContent() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
            Trading Playbook
          </p>
          <h1 className="text-4xl font-bold text-white">Three layers, one position size</h1>
          <p className="text-lg text-gray-300 leading-relaxed">
            The Horizon model sets direction and base size. y2y3 confirms or vetoes it same-day.
            RateTiers gets a second veto. Below is today&apos;s live readout, followed by the exact
            rules behind it.
          </p>
        </header>

        <section className="rounded-2xl border-2 border-blue-500/20 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-white mb-4">Today&apos;s play</h2>
          <TodaysPlaybookPanel />
        </section>

        <section className="space-y-4">
          <LayerCard tag="Layer 1" tagColor="#2dd4bf" title="Horizon model" role="Direction &amp; base size">
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">
              A RandomForest, retrained fresh every trading day, forecasts SPY&apos;s high, low, and
              close 10 and 20 trading days out from today&apos;s open using money-flow and options
              positioning. This is the trade being taken — Layers 2 and 3 only decide whether it&apos;s
              allowed through.
            </p>
            <RuleRow
              label="Direction"
              value="Long if the forecast's predicted close sits above today's open; short if below."
            />
            <RuleRow
              label="Conviction (z)"
              value={<code className="font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">z = |predicted move| ÷ (predicted high − predicted low)</code>}
            />
            <RuleRow
              label="Sizing"
              value="0 contracts below the 40th percentile of z; 2 (40–60th); 4–6, normal (60–90th); 10 (90–97th); 20, max, top 3%."
            />
            <RuleRow label="Take-profit" value="The forecast's own predicted close for that horizon." />
            <RuleRow
              label="Stop-loss"
              value="0.5× the forecast's predicted high−low band width, placed against the position."
            />
            <RuleRow
              label="Exit"
              value="Whichever of stop, target, or horizon-end hits first on the real daily price path."
            />
          </LayerCard>

          <LayerCard tag="Layer 2" tagColor="#fbbf24" title="y2y3 confirmation" role="Same-day veto + own trades">
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">
              An RF+NN blend predicts that same day&apos;s own high/low/close relative to the open — a
              fast pre-market read resolved by the close. It fires its own same-day trades and can
              block a Layer 1 entry that disagrees with it.
            </p>
            <RuleRow
              label="Signal"
              value={<code className="font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">y2y3 = pred(high−open) + pred(low−open)</code>}
            />
            <RuleRow
              label="Thresholds"
              value="y2y3 ≤ −3.0 → short · y2y3 ≥ −0.3 → long · between → no signal that day."
            />
            <RuleRow label="Sizing" value="Regular 3 (long) / −1 (short) · Aggressive 5 / −3 · Super 7 / −5." />
            <RuleRow
              label="Filter rule"
              value="A Layer 1 trade is only taken if y2y3 agrees in direction, or has no strong opinion."
            />
          </LayerCard>

          <LayerCard tag="Layer 3" tagColor="#c084fc" title="RateTiers confirmation" role="Second veto">
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">
              Three independent same-day models — RandomForest, RF+NN blend, and TabNet — each
              retrained daily. Every model&apos;s prediction is scored against its own trailing
              history, then the three are combined by skill: a model earns more say the better its
              trailing 60-day accuracy has actually been.
            </p>
            <RuleRow
              label="Net bias"
              value={<code className="font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">net_bias = long_score − short_score</code>}
            />
            <RuleRow
              label="Filter rule"
              value="Applied after Layer 2's filter — a trade that already cleared y2y3 is only kept if RateTiers also agrees or is neutral."
            />
            <RuleRow
              label="What it actually does"
              value="Win rate barely moves when it's added — its effect is cutting the size of the worst losses, not picking more winners."
            />
          </LayerCard>
        </section>

        <section className="rounded-2xl border-2 border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
          <h2 className="text-lg font-bold text-white mb-3">Portfolio-wide rules</h2>
          <RuleRow label="Contract cap" value="20 total open contracts across every layer, at all times. New entries are sized down or skipped if this would be breached." />
          <RuleRow label="Instrument" value="MES — $5/point/contract, ~$2,500 margin/contract." />
        </section>

        <section className="rounded-2xl border-2 border-amber-500/25 bg-amber-950/10 p-6">
          <h2 className="text-lg font-bold text-amber-300 mb-3">Read this before risking real money</h2>
          <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
            <p>
              Every rule above came from a genuine walk-forward backtest on real historical SPY
              options and price data (2010–2026) — not live trading. No commissions or slippage are
              modeled, and fills are assumed at the exact computed level.
            </p>
            <p>
              RateTiers was validated on two ~100-day slices, not the full cross-regime windows
              Layers 1–2 were tested on — the same effect showed up in both, which is reassuring,
              but it&apos;s a thinner sample than the rest of this page.
            </p>
            <p>
              This is quantitative research output, not licensed financial advice. Past backtest
              performance on these specific historical windows does not guarantee future results.
            </p>
          </div>
        </section>

        <div className="text-center">
          <Link href="/summary" className="text-sm text-blue-400 hover:text-blue-300 underline decoration-dotted">
            ← Back to Summary
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function PlaybookPage() {
  return (
    <ProtectedRoute requireSubscription>
      <PlaybookPageContent />
    </ProtectedRoute>
  )
}
