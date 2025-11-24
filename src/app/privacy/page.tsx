import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'Privacy Policy',
  description: 'Understand how Predixa collects, uses, and safeguards your information across our products and services.',
  path: '/privacy',
})

const dataTypes = [
  {
    title: 'Account information',
    description:
      'Name, email address, authentication identifiers, and profile details you provide when registering or managing your account.',
  },
  {
    title: 'Subscription & billing data',
    description:
      'Payment method details, transaction history, and subscription status processed securely through our billing partners (Stripe and RevenueCat).',
  },
  {
    title: 'Usage analytics',
    description:
      'Events, feature interactions, and device information that help us improve platform performance and reliability.',
  },
  {
    title: 'Support communications',
    description:
      'Messages, attachments, and context you share when contacting Predixa support so we can resolve requests effectively.',
  },
]

const sharingPractices = [
  {
    title: 'Service providers',
    description:
      'Trusted vendors such as Stripe, AWS, RevenueCat, and analytics partners who operate components of the Predixa platform.',
  },
  {
    title: 'Legal & compliance',
    description: 'Authorities or third parties when required to comply with applicable laws, regulations, or legal processes.',
  },
  {
    title: 'Business transfers',
    description:
      'Successors in the event of a merger, acquisition, or other corporate transaction, subject to continued protection of your data.',
  },
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-12 text-gray-700 dark:text-gray-300">
      <header className="space-y-4">
        <p className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200">
          Legal
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Predixa Privacy Policy</h1>
        <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Last Updated: January 2025</p>
        <p className="text-lg">
          This Privacy Policy explains how Predixa (the &quot;Company&quot;, &quot;we&quot;, or &quot;us&quot;) collects, uses, and safeguards information
          when you interact with our website, web application, iOS app, and related services (collectively, the &quot;Platform&quot;).
          By using Predixa, you agree to the practices described below.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">1. Information we collect</h2>
        <p>We collect information to deliver, secure, and improve the Predixa experience:</p>
        <div className="grid gap-6 md:grid-cols-2">
          {dataTypes.map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">2. How we use information</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>Provide and maintain core platform functionality, including authentication and personalized analytics.</li>
          <li>Process transactions, manage subscriptions, and deliver invoices or billing notices.</li>
          <li>Monitor performance, troubleshoot issues, and protect against fraud or abuse.</li>
          <li>Develop new features, conduct product research, and improve user experience.</li>
          <li>Communicate service updates, educational content, and support responses.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">3. How we share information</h2>
        <p>We do not sell your personal data. We may share limited information in the following situations:</p>
        <div className="grid gap-6 md:grid-cols-2">
          {sharingPractices.map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">4. Data retention</h2>
        <p>
          We retain your information while your account is active and for a reasonable period afterward to comply with legal,
          tax, and reporting obligations. You may request deletion of personal data by contacting us at{' '}
          <a href="mailto:support@predixaweb.com" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            support@predixaweb.com
          </a>
          . Some data may remain in backups or logs for a limited time.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">5. Security</h2>
        <p>
          We implement technical and organizational measures to protect your information, including encryption in transit,
          access controls, audit logging, and regular security reviews. Despite our efforts, no system is completely secure,
          so please use unique, strong passwords and notify us promptly of any suspected account compromise.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">6. Your choices</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>Access, update, or delete account information from your profile or by contacting support.</li>
          <li>Manage marketing or product update emails via unsubscribe links or support requests.</li>
          <li>Control analytics or cookie preferences through in-product settings (coming soon).</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">7. International transfers</h2>
        <p>
          Predixa operates from the United States. If you access the Platform from other regions, your information may be
          transferred to, stored, and processed in the U.S. We maintain safeguards consistent with applicable data protection
          laws when transferring information across borders.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">8. Children&apos;s privacy</h2>
        <p>
          Predixa is not intended for individuals under 18 years of age, and we do not knowingly collect personal information
          from children. If you believe a child has provided us with data, contact us so we can delete it.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">9. Updates to this policy</h2>
        <p>
          We may update this Privacy Policy to reflect changes in technology, regulation, or our services. We will post the
          updated policy here and adjust the &quot;Last Updated&quot; date. Material changes may also be communicated via email or
          in-product notifications.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-500/30 dark:bg-blue-500/10">
        <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100">10. Contact us</h2>
        <p className="text-blue-900 dark:text-blue-100">
          If you have questions about this Privacy Policy or how Predixa handles data, email{' '}
          <a href="mailto:support@predixaweb.com" className="underline">
            support@predixaweb.com
          </a>{' '}
          and we&apos;ll respond within 24–48 hours.
        </p>
      </section>
    </main>
  )
}

