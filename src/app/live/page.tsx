import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'
import LiveDashboard from './LiveDashboard'

export const metadata: Metadata = createMetadata({
  title: 'Live Options Money Move — SPY QQQ + top single names | Predixa',
  description:
    'Where the day’s option dollars are going, minute by minute, for SPY, QQQ and the biggest single names (NVDA, TSLA, AAPL, MSFT, AMZN, GOOG, META, AMD, AVGO) — the busiest contracts by traded value across today’s and the next two monthly expirations.',
  path: '/live',
})

export default function LivePage() {
  return (
    <main className="mx-auto max-w-[120rem] px-6 py-6 space-y-4 text-gray-700 dark:text-gray-300">
      <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Live options money move
      </h1>
      <LiveDashboard />
    </main>
  )
}
