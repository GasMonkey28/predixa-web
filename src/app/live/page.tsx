import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'
import OptionChainLive from './OptionChainLive'
import MoneyMoveChart from './MoneyMoveChart'

export const metadata: Metadata = createMetadata({
  title: 'Live SPY Option Chain | 1-Minute Snapshots | Predixa',
  description:
    'Live SPY option chain updated every minute during market hours — bid/ask, volume, open interest, and IV/greeks computed from the quote mid with a forward-based model.',
  path: '/live',
})

export default function LivePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-10 text-gray-700 dark:text-gray-300">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Live SPY Option Chain
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          A full snapshot of the SPY option surface, taken once a minute from
          9:30–16:00 ET. Near-the-money strikes for the nearest six expirations,
          with implied volatility and greeks computed from each quote&apos;s mid.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Today&apos;s money move
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Where the dollars are going — cumulative traded value for today&apos;s 10
          busiest SPY option contracts, minute by minute.
        </p>
        <MoneyMoveChart />
      </section>

      <OptionChainLive />
    </main>
  )
}
