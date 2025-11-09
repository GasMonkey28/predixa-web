import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy | Predixa',
  description: 'Learn how Predixa uses cookies and similar technologies to deliver a secure and reliable experience.',
}

const cookieTypes = [
  {
    title: 'Essential cookies',
    description:
      'Required for the Platform to function, including authentication, security, and network management. These cookies cannot be switched off because they enable core features such as logging in, maintaining sessions, and delivering requests safely.',
  },
  {
    title: 'Performance & analytics cookies',
    description:
      'Help us understand how the Platform is used so we can improve reliability and product experience. We aggregate usage data and do not use analytics cookies to identify individual users. Analytics is limited to Predixa-operated tools or trusted partners that comply with our privacy standards.',
  },
  {
    title: 'Preference cookies',
    description:
      'Store choices like theme mode, chart settings, and dismissals of in-product announcements. These cookies ensure Predixa remembers your preferences across sessions.',
  },
]

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-12 text-gray-700 dark:text-gray-300">
      <header className="space-y-4">
        <p className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200">
          Legal
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Predixa Cookie Policy</h1>
        <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Last Updated: January 2025</p>
        <p className="text-lg">
          This Cookie Policy explains how Predixa (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) uses cookies and similar technologies on
          predixaweb.com, the Predixa web application, and associated services (collectively, the &quot;Platform&quot;). By using the
          Platform, you consent to the storage and access of cookies as described below.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">1. What are cookies?</h2>
        <p>
          Cookies are small text files that websites store on your device to remember information about your visit. Cookies
          can be first-party (set by Predixa) or third-party (set by trusted partners providing services on our behalf).
          We also use similar technologies like local storage and session storage to cache preferences and process data
          efficiently.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">2. Types of cookies we use</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {cookieTypes.map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">3. Why we use cookies</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>Authenticate users and maintain secure sessions across the Platform.</li>
          <li>Remember user preferences such as chart layouts, watchlists, and interface settings.</li>
          <li>Analyze how features perform so we can optimize load times, reliability, and product roadmap decisions.</li>
          <li>Detect and prevent fraud, abuse, and unauthorized access attempts.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">4. Managing cookies</h2>
        <p>
          Most browsers accept cookies by default, but you can adjust settings to block or delete them. The process varies by
          browser, so refer to your browser&apos;s help documentation for detailed instructions. Please note that blocking essential
          cookies may impact core functionality such as logging in or accessing secure areas of the Platform.
        </p>
        <p>
          In the future, we plan to offer in-product controls for managing non-essential cookies. Until then, you can
          opt out of analytics cookies by contacting us at{' '}
          <a href="mailto:support@predixaweb.com" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            support@predixaweb.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">5. Third-party cookies</h2>
        <p>
          We limit the use of third-party cookies to essential services that support the Platform (e.g., payment processing,
          security, and analytics). These partners are contractually obligated to handle data according to our privacy
          standards and applicable laws. We do not permit third parties to use cookies for advertising on Predixa.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">6. Updates to this policy</h2>
        <p>
          We may update this Cookie Policy to reflect changes in laws, technology, or our service offerings. Updates will be
          posted on this page with a new &quot;Last Updated&quot; date. Material changes may also be communicated via email or
          in-product notifications.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-500/30 dark:bg-blue-500/10">
        <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100">7. Contact us</h2>
        <p className="text-blue-900 dark:text-blue-100">
          Questions about this Cookie Policy? Email{' '}
          <a href="mailto:support@predixaweb.com" className="underline">
            support@predixaweb.com
          </a>{' '}
          and our team will respond within 24–48 hours.
        </p>
      </section>
    </main>
  )
}

