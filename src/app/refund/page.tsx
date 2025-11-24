import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Refund Policy',
  description: 'Understand how refunds, cancellations, and billing disputes are handled for Predixa subscriptions.',
  path: '/refund',
})

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-12 text-gray-700 dark:text-gray-300">
      <header className="space-y-4">
        <p className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200">
          Legal
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Predixa Refund Policy</h1>
        <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Last Updated: January 2025</p>
        <p className="text-lg">
          This Refund Policy describes how Predixa (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) handles cancellations, refunds, and billing disputes
          for subscriptions purchased through predixaweb.com and the Predixa web application (collectively, the &quot;Platform&quot;).
          By subscribing to Predixa, you agree to the terms below.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">1. Subscription renewals</h2>
        <p>
          Predixa subscriptions renew automatically at the end of each billing cycle (monthly or yearly) unless cancelled
          before the renewal date. Renewal charges are processed using the payment method on file.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">2. Cancellation</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>You may cancel your subscription at any time from the account billing portal.</li>
          <li>Cancellation stops future renewals but does not trigger a refund for the current billing period.</li>
          <li>After cancellation, you retain access to paid features until the end of the current term.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">3. Refund eligibility</h2>
        <p>Refunds may be granted at our discretion in the following limited circumstances:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Duplicate billing caused by a technical error on Predixa&apos;s systems.</li>
          <li>Unauthorized charges resulting from account compromise, when reported promptly.</li>
          <li>Service outage or technical issue preventable by Predixa that persists for more than 72 consecutive hours.</li>
        </ul>
        <p>
          Requests must be submitted within 14 days of the charge. We may request additional information to verify the issue
          before issuing a credit or refund.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">4. Non-refundable items</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>Partial months or unused time after cancellation.</li>
          <li>Introductory promotions, coupons, or discounted upgrade packages.</li>
          <li>One-time onboarding, consulting, or custom research services.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">5. How to request a refund</h2>
        <p>
          Email{' '}
          <a href="mailto:support@predixaweb.com" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            support@predixaweb.com
          </a>{' '}
          with the subject line &quot;Refund Request&quot; and include:
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>The email associated with your Predixa account.</li>
          <li>The invoice ID or transaction reference.</li>
          <li>A brief description of the issue prompting the request.</li>
        </ul>
        <p>Our team reviews requests within 24–48 hours and will confirm next steps by email.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">6. Chargebacks</h2>
        <p>
          If a chargeback is initiated through your bank or card provider, we may suspend account access while the dispute is
          investigated. Resolving the chargeback in Predixa&apos;s favor may restore access once outstanding balances are settled.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">7. Changes to this policy</h2>
        <p>
          We may update this Refund Policy to reflect changes in our service or billing practices. Updates will be posted on
          this page with a revised &quot;Last Updated&quot; date and may be communicated via email or in-product notification.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-500/30 dark:bg-blue-500/10">
        <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100">Need help?</h2>
        <p className="text-blue-900 dark:text-blue-100">
          Contact{' '}
          <a href="mailto:support@predixaweb.com" className="underline">
            support@predixaweb.com
          </a>{' '}
          for billing questions or to discuss your request. We respond within 24–48 hours.
        </p>
      </section>
    </main>
  )
}

