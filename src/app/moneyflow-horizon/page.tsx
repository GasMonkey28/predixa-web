import type { Metadata } from 'next'
import Link from 'next/link'
import { createMetadata } from '@/lib/seo'
import LiveForecastTable from './LiveForecastTable'
import HorizonLinesChart from './HorizonLinesChart'

export const metadata: Metadata = createMetadata({
  title: 'SPY Money-Flow Horizon Forecast | 5/10/15/20-Day Range Prediction | Predixa',
  description:
    'SPY 5/10/15/20-trading-day price range forecast built from near-the-money options money-flow, greeks, and implied volatility, weighted by call-side conviction.',
  path: '/moneyflow-horizon',
})

export default function MoneyFlowHorizonPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-12 text-gray-700 dark:text-gray-300">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          SPY Money-Flow Horizon Forecast
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          A 5/10/15/20-trading-day SPY price range forecast built from near-the-money
          options money-flow: dollar open-interest shifts, greeks, and implied
          volatility, weighted by how much real conviction moved on each day.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Today&apos;s forecast
        </h2>
        <LiveForecastTable />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Forecast history
        </h2>
        <p>
          Daily SPY candles with each horizon&apos;s rolling forecast line overlaid
          &mdash; every colored line traces that horizon&apos;s predicted close, plotted
          on the day the forecast was made. Toggle any horizon on or off, and hover
          a day for the full readout.
        </p>
        <HorizonLinesChart />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          How this model is different
        </h2>
        <p>
          Most range models lean on price action and volatility alone. This one is
          built primarily from options positioning: each day, it finds the
          option contract nearest the money with the largest dollar-value open-interest
          shift, separately for calls and puts, and pulls in that contract&apos;s
          greeks and implied volatility. The idea is that where real money is
          concentrating in the options chain says something about expected price
          movement that price history alone doesn&apos;t capture.
        </p>
        <p>
          A key refinement: rather than averaging that signal evenly over a rolling
          window, each day&apos;s contribution is weighted by how much call-side dollar
          flow moved that day. A day with a large, decisive move counts more toward
          the smoothed signal than a quiet day. In backtesting, this weighting
          measurably improved accuracy over a plain rolling average across every
          horizon tested.
        </p>
        <p>
          The forecast intentionally does not include a same-day (1-day-ahead)
          horizon. That version was tested and found to perform worse than simply
          guessing the market&apos;s prevailing direction, so it was left out rather
          than shipped as a weak signal.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Honest limitations
        </h2>
        <p>
          This model was validated with a tune/confirm methodology — a candidate
          feature is only kept if it improves accuracy on a held-out window it never
          saw during selection, checked in both directions. That discipline caught
          several ideas that looked good on paper and didn&apos;t hold up; what
          remains is what survived.
        </p>
        <p>
          Even so, the backtest period covers mostly a rising market with one
          real correction, not a full bear-market cycle. Accuracy figures are
          direction and range-hit rates, not realized trading P&amp;L — they don&apos;t
          account for slippage, spread, or execution costs. Treat this as a
          research-grade signal to combine with your own judgment and risk
          management, not a standalone trading system.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-900/50">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Explore More SPY Analytics
        </h2>
        <nav className="flex flex-wrap gap-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">
            Home
          </Link>
          <Link href="/spy-forecast" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">
            SPY Forecast
          </Link>
          <Link href="/range-forecast" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">
            Range Forecast
          </Link>
          <Link href="/spy-signals" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">
            SPY Signals
          </Link>
          <Link href="/options-flow" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">
            Options Flow
          </Link>
          <Link href="/about" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">
            About
          </Link>
        </nav>
      </section>
    </main>
  )
}
