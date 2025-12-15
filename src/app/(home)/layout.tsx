import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'SPY Forecast & AI Signals | Predixa',
  description: 'Get daily SPY Forecast and SPY Signals with direction probability, tier rankings, range forecasts, and options flow analysis. Professional trading analytics for swing trading and stock market analysis. Start your 7-day free trial.',
  path: '/',
})

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
