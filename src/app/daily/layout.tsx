import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Daily SPY Analysis | SPY Forecast & Trading Signals | Predixa',
  description: 'Today\'s SPY forecast with AI signals, direction probability, and tier rankings. Real-time charts, support/resistance levels, and options flow for traders.',
  path: '/daily',
})

export default function DailyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
