import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Trade Journal | Position & PnL Tracking | Predixa',
  description: 'Record SPY trades with entry price, target, sold price, profit, reason, and rating.',
  path: '/trade-journal',
})

export default function TradeJournalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
