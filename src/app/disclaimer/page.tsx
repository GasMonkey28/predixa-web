import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Disclaimer | Predixa',
  description: 'Read the Predixa disclaimer covering educational use, risk, and responsibility for trading decisions.',
}

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-12 text-gray-700 dark:text-gray-300">
      <header className="space-y-4">
        <p className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200">
          Legal
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Predixa Disclaimer</h1>
        <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Last Updated: January 2025</p>
        <p className="text-lg">
          This Disclaimer applies to the Predixa website, web application, mobile apps, and all related communications
          (collectively, the &quot;Platform&quot;). By accessing Predixa, you acknowledge and agree to the statements outlined below.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">1. Educational content only</h2>
        <p>
          Predixa provides market research, analytics, and educational material for informational purposes. We are not a
          registered broker-dealer, investment adviser, or financial planner, and nothing on the Platform constitutes a
          solicitation, recommendation, or endorsement of any security, strategy, or trading style.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">2. No guarantee of results</h2>
        <p>
          Market data, backtests, forecasts, and rankings provided by Predixa are based on historical information and modeling
          assumptions that may change without notice. Past performance is not indicative of future results, and we do not
          guarantee the accuracy, completeness, or suitability of any information for your specific circumstances.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">3. Trading and investment risk</h2>
        <p>
          Trading securities, derivatives, and other financial instruments involves substantial risk, including the possible
          loss of principal. You are solely responsible for evaluating your financial situation, risk tolerance, and strategy
          before making decisions. Consult licensed financial, tax, or legal professionals for personalized advice.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">4. User responsibility</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>You are responsible for verifying any information from Predixa before acting on it.</li>
          <li>Predixa is not liable for trading losses, opportunity costs, or decisions made based on our data.</li>
          <li>You agree to use the Platform in accordance with all applicable laws and regulations.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">5. Third-party content</h2>
        <p>
          The Platform may reference or link to third-party data sources, news, or services. Predixa does not control these
          external resources and is not responsible for their accuracy, availability, or performance. Inclusion of third-party
          content does not constitute endorsement.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">6. Limitation of liability</h2>
        <p>
          Predixa, its affiliates, and its team members are not liable for any direct, indirect, incidental, consequential, or
          punitive damages arising from your use of—or inability to use—the Platform. This limitation applies even if Predixa
          has been advised of the possibility of such damages.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">7. Updates to this disclaimer</h2>
        <p>
          We may update this Disclaimer from time to time to reflect changes in our services, regulations, or industry
          standards. Revisions will be posted on this page with a new &quot;Last Updated&quot; date. Continued use of the Platform after
          updates constitutes acceptance of the revised terms.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-500/30 dark:bg-blue-500/10">
        <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100">Questions?</h2>
        <p className="text-blue-900 dark:text-blue-100">
          Contact{' '}
          <a href="mailto:support@predixaweb.com" className="underline">
            support@predixaweb.com
          </a>{' '}
          if you need clarification about how this Disclaimer applies to your use of Predixa. We respond within 24–48 hours.
        </p>
      </section>
    </main>
  )
}

