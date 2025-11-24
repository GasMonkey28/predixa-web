import type { Metadata } from 'next'
import Link from 'next/link'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'About Predixa',
  description: 'Learn more about Predixa, our mission, and the policies that guide our products. Professional analytics for disciplined market participants.',
  path: '/about',
})

const highlights = [
  {
    title: 'Our Mission',
    description:
      'Deliver professional-grade trading analytics and market intelligence that empower independent traders to make confident decisions.',
  },
  {
    title: 'What We Do',
    description:
      'We combine institutional-quality tools, curated education, and timely market research in a platform designed for accessibility and speed.',
  },
  {
    title: 'Who We Serve',
    description:
      'Active traders and investors who want an edge in the markets through actionable insights, back-tested strategies, and disciplined risk management.',
  },
]

const policyLinks: Array<{
  title: string
  description: string
  href?: string
  status: 'available' | 'coming-soon'
}> = [
  {
    title: 'Terms of Service',
    description: 'Understand how you can use Predixa and what you can expect from us as a service provider.',
    href: '/terms',
    status: 'available',
  },
  {
    title: 'Privacy Policy',
    description: 'See how we collect, store, and safeguard personal data across our applications and services.',
    href: '/privacy',
    status: 'available',
  },
  {
    title: 'Cookie Policy',
    description: 'Understand how we use cookies and similar technologies to support authentication, preferences, and analytics.',
    href: '/cookies',
    status: 'available',
  },
  {
    title: 'Refund Policy',
    description: 'Review how cancellations, refunds, and billing disputes are handled for Predixa subscriptions.',
    href: '/refund',
    status: 'available',
  },
  {
    title: 'Disclaimer',
    description: 'Important disclosures about the educational nature of Predixa and the risks of trading and investing.',
    href: '/disclaimer',
    status: 'available',
  },
  {
    title: 'Risk Disclaimer',
    description: 'Learn more about trading risks and how to use our analytics responsibly as part of your process.',
    status: 'coming-soon',
  },
]

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-16">
      <section className="space-y-6">
        <p className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          About Predixa
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Professional analytics for disciplined market participants
        </h1>
        <p className="max-w-3xl text-lg text-gray-600 dark:text-gray-300">
          Predixa exists to help traders and investors approach the markets with clarity. We blend quantitative research,
          historical testing, and real-time monitoring into a single workspace so you can spend less time collecting data
          and more time making informed decisions.
        </p>
      </section>

      <section className="grid gap-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {highlights.map((item) => (
          <div key={item.title} className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{item.title}</h2>
            <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">How we operate</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Data integrity</h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Every dataset we onboard is validated, normalized, and versioned. We partner with reputable vendors and
              supplement with proprietary research to keep you ahead of the curve.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Education first</h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Tools are only as useful as the process behind them. We publish playbooks, explainers, and scenario planning
              guides to help you integrate Predixa into your workflow responsibly.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Security & privacy</h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Your data is encrypted in transit and at rest. Access is strictly controlled, audited, and limited to what
              our team needs to support your account.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Responsible trading</h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Markets are risky. We reinforce the importance of position sizing, risk controls, and independent judgement
              across our platform and communications.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Policies & disclosures</h2>
        <p className="max-w-3xl text-gray-600 dark:text-gray-400">
          We&apos;re transitioning our policies from Notion to first-party pages. While these documents are being
          finalized, you can reach our team for copies or questions at{' '}
          <a href="mailto:support@predixaweb.com" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            support@predixaweb.com
          </a>
          .
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {policyLinks.map((policy) => {
            const isAvailable = policy.status === 'available'
            return (
              <div
                key={policy.title}
                className={`rounded-xl border p-6 ${
                  isAvailable
                    ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                    : 'border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40'
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {isAvailable ? 'Available now' : 'Coming soon'}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{policy.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{policy.description}</p>
                {isAvailable && policy.href ? (
                  <Link
                    href={policy.href}
                    className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View document
                  </Link>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-8 dark:border-blue-500/30 dark:bg-blue-500/10">
        <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-200">
          Have questions or need clarification?
        </h2>
        <p className="mt-3 text-blue-800 dark:text-blue-200/80">
          Email us at{' '}
          <a href="mailto:support@predixaweb.com" className="underline">
            support@predixaweb.com
          </a>{' '}
          and a member of the Predixa team will respond within 24–48 hours.
        </p>
      </section>
    </main>
  )
}

