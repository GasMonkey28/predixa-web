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
    <main className="mx-auto max-w-[120rem] px-6 py-6 space-y-4 text-gray-700 dark:text-gray-300">
      <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Live Option Chain
      </h1>
      <LiveDashboard />
    </main>
  )
}
