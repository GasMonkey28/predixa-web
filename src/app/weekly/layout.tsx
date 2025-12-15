import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Weekly SPY Analysis | Weekly Forecast & Trading Signals | Predixa',
  description: 'View weekly SPY forecast with direction probability, tier rankings, price levels, and trading signals. Get weekly SPY analysis with charts and support/resistance levels for swing trading strategies.',
  path: '/weekly',
})

export default function WeeklyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
