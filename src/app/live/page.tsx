import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'
import LiveDashboard from './LiveDashboard'

export const metadata: Metadata = createMetadata({
  title: 'Live Option Chain — SPY QQQ + top single names | Predixa',
  description:
    'Live option chains for SPY, QQQ and the biggest single names (NVDA, TSLA, AAPL, MSFT, AMZN, GOOG, META, AMD, AVGO), updated every minute during market hours — bid/ask, volume, OI, and IV/greeks from the quote mid.',
  path: '/live',
})

export default function LivePage() {
  return (
    <main className="mx-auto max-w-[120rem] px-6 py-12 space-y-10 text-gray-700 dark:text-gray-300">
      <header className="max-w-5xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Live Option Chain
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          A full snapshot of the option surface, taken once a minute from
          9:30–16:00 ET. Near-the-money strikes for the nearest six expirations,
          with implied volatility and greeks computed from each quote&apos;s mid.
        </p>
      </header>

      <LiveDashboard />
    </main>
  )
}
