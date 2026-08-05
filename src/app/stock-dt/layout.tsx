import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Stock DT | Summary Long/Short Paper Trades | Predixa',
  description:
    'Day-trade equities from summary long/short ranks above the 17 line on TradeStation paper, score-weighted across $5k long / $5k short.',
  path: '/stock-dt',
})

export default function StockDtLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
