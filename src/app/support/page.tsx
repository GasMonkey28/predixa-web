import type { Metadata } from 'next'
import Link from 'next/link'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Support',
  description: 'Get help with Predixa, explore our knowledge resources, or contact the team directly.',
  path: '/support',
})

const supportChannels: never[] = []
const quickLinks: never[] = []

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-16">
      <section className="space-y-6">
        <p className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          Customer Support
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">How can we help?</h1>
        <p className="max-w-3xl text-lg text-gray-600 dark:text-gray-300">
          Whether you&apos;re onboarding your workspace, troubleshooting data, or exploring new features, this page pulls
          together the fastest ways to get answers from Predixa.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Email support</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Reach us directly at{' '}
            <a href="mailto:support@predixaweb.com" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              support@predixaweb.com
            </a>
            . We respond to most inquiries within 24–48 hours.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li>• Include your registered email address</li>
            <li>• Share screenshots or error messages, if applicable</li>
            <li>• Let us know the urgency so we can prioritize appropriately</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Live sessions</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            We&apos;re building guided onboarding and Q&amp;A sessions for teams that prefer hands-on walkthroughs. In the
            meantime, reach out via email and we&apos;ll coordinate the best path forward.
          </p>
          <span className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Scheduling coming soon
          </span>
        </div>
      </section>

      {/* Self-service resources and quick links will return once the public KB and status page launch */}

    </main>
  )
}

