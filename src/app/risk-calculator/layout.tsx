import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Risk Control Calculator | SPY Trading Risk Management | Predixa',
  description: 'Calculate playable hands for long and short SPY positions based on scenarios and probabilities. Risk management calculator for SPY trading with position sizing and risk assessment tools.',
  path: '/risk-calculator',
})

export default function RiskCalculatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
