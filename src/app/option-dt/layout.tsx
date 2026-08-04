import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Option DT | Summary Long/Short Paper Trades | Predixa',
  description:
    'Day-trade OTM options from summary long/short ranks above the 17 line on TradeStation paper.',
  path: '/option-dt',
})

export default function OptionDtLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
