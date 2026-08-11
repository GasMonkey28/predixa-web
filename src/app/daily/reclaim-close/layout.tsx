import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Model Reclaim-at Close (Long) | Predixa',
  description:
    'Live long reclaim-at-close: tickers currently breaching Model1 pred_low — prepare to buy near the close.',
  path: '/daily/reclaim-close',
})

export default function ReclaimCloseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
