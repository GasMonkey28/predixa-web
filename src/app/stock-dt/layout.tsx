import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Stock DT | Ranks, Reclaim, or Reclaim-at Close | Predixa',
  description:
    'Day-trade equities from summary ranks, Model Reclaim signals, or live long Reclaim-at Close breaches on TradeStation paper, score-weighted across an adjustable per-side budget (default $5k).',
  path: '/stock-dt',
})

export default function StockDtLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
