import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Stock DT | Summary Ranks or Model Reclaim Paper Trades | Predixa',
  description:
    'Day-trade equities from summary long/short ranks or Model Reclaim win-rate filters on TradeStation paper, score-weighted across an adjustable per-side budget (default $5k).',
  path: '/stock-dt',
})

export default function StockDtLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
