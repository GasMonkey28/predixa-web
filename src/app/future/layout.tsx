import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'SPY Options Flow Analysis | Future Options Flow | Predixa',
  description: 'Analyze SPY options flow with interactive charts showing call and put activity. View options flow data by strike price, expiration date, and volume to understand market sentiment and trading activity.',
  path: '/future',
})

export default function FutureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
