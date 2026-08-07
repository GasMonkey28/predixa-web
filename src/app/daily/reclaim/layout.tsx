import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Model Reclaim | Range Reclaim Signals | Predixa',
  description:
    'Range Reclaim fades Model1 predicted high/low band breakouts with tier and y2y3 size bonuses.',
  path: '/daily/reclaim',
})

export default function ReclaimLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
