import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'SPY Forecast & AI Signals | Predixa',
  description: 'Daily SPY forecasts with AI signals, direction probability, and tier rankings. Real-time options flow and market analytics. Start your 7-day free trial today.',
  path: '/',
})

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
