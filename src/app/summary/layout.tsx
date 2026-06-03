import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Market Insight | Daily SPY Summary | Predixa',
  description:
    "Today's SPY market insight: tier stance, model alignment, and weekly context. Rule-based summary from Predixa signals—not financial advice.",
  path: '/summary',
})

export default function SummaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
