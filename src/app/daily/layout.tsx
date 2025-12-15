import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Daily SPY Analysis | SPY Forecast & Trading Signals | Predixa',
  description: 'View today\'s SPY forecast with direction probability, tier rankings, price levels, and trading signals. Get daily SPY analysis with charts, support/resistance levels, and options flow data for active traders.',
  path: '/daily',
})

export default function DailyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
