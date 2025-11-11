import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Predixa',
  description:
    'Read the Predixa Terms of Service. These terms govern how you access and use Predixa products and services.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-12 text-gray-700 dark:text-gray-300">
      <header className="space-y-4">
        <p className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200">
          Legal
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Predixa Terms of Service</h1>
        <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Last Updated: January 2025
        </p>
        <p className="text-lg">
          By accessing or using the Predixa website, web application, or related online services (collectively, the
          &quot;Platform&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms,
          do not use the Platform.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
        <p>By using Predixa, you confirm that you are legally able to enter into this agreement and that you accept these Terms.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">2. Description of Service</h2>
        <p>Predixa provides financial market analytics and workflow tools through its web-based Platform, including:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Daily market commentary, tiers, and pricing levels derived from S3-hosted market data</li>
          <li>Weekly outlooks and curated insights surfaced in the web application</li>
          <li>Economic calendar events sourced from Investing.com and FRED feeds</li>
          <li>Account management, billing portal access, and subscription status handling</li>
          <li>Customer support via email and in-product notifications</li>
        </ul>
        <p>
          Experimental or roadmap features may be introduced progressively. We clearly label beta functionality and it may be
          withdrawn without notice.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">3. User Accounts</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">3.1 Registration</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>You must provide accurate and complete information.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must be at least 18 years old to use this service.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">3.2 Account Security</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Keep your password confidential.</li>
          <li>Notify us immediately of any unauthorized access.</li>
          <li>You are responsible for all activities under your account.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">4. Subscription Plans</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">4.1 Available Plans</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Free Plan:</strong> Limited access to basic features.
          </li>
          <li>
            <strong>Monthly Pro:</strong> $19.99/month with full feature access.
          </li>
          <li>
            <strong>Yearly Pro:</strong> $179.99/year with full feature access.
          </li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">4.2 Billing</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Subscriptions auto-renew unless cancelled.</li>
          <li>Payments are processed through our billing partner (Stripe) using the payment method you provide.</li>
          <li>Prices are subject to change with 30 days notice.</li>
          <li>No refunds for partial subscription periods.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">4.3 Cancellation</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Cancel anytime through your online account settings or customer billing portal.</li>
          <li>Access continues until the end of the billing period.</li>
          <li>No refunds for unused time after cancellation.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">5. Use of Service</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">5.1 Acceptable Use</h3>
        <p>You agree to:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Use the Platform only for lawful purposes.</li>
          <li>Not interfere with or disrupt the service.</li>
          <li>Not attempt to gain unauthorized access.</li>
          <li>Not use automated systems to access the Platform.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">5.2 Prohibited Activities</h3>
        <p>You may not:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Share your account credentials.</li>
          <li>Reproduce, distribute, or resell Platform content.</li>
          <li>Use the service for market manipulation.</li>
          <li>Reverse engineer or attempt to extract source code.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">6. Financial Disclaimer</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">6.1 No Investment Advice</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Predixa provides informational content only.</li>
          <li>Content is not financial, investment, or trading advice.</li>
          <li>We are not licensed financial advisors.</li>
          <li>All investment decisions are your sole responsibility.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">6.2 Market Risks</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Trading and investing involve substantial risk.</li>
          <li>Past performance does not guarantee future results.</li>
          <li>You may lose some or all of your investment.</li>
          <li>Consult with a qualified financial advisor before making decisions.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">6.3 No Guarantees</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>We do not guarantee accuracy of data or forecasts.</li>
          <li>Market data may be delayed or contain errors.</li>
          <li>Predictions and rankings are for informational purposes only.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">7. Intellectual Property</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">7.1 Ownership</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>All content, features, and functionality are owned by Predixa.</li>
          <li>Content is protected by copyright, trademark, and other laws.</li>
          <li>You receive a limited license to use the Platform.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">7.2 Your License</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Personal, non-commercial use only.</li>
          <li>Non-exclusive, non-transferable, revocable.</li>
          <li>Does not include the right to modify or distribute.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">8. Data and Privacy</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>Your use is governed by our Privacy Policy.</li>
          <li>We collect and process data as described in the Privacy Policy.</li>
          <li>You consent to data collection and processing.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">9. Third-Party Services</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">9.1 Integration</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>We use third-party services (Stripe, RevenueCat, and market data providers).</li>
          <li>These services have their own terms and policies.</li>
          <li>We are not responsible for third-party service issues.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">9.2 Data Providers</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Market data may be provided by third parties.</li>
          <li>Data accuracy depends on third-party sources.</li>
          <li>We are not liable for third-party data errors.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">10. Disclaimers</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">10.1 Service &ldquo;As Is&rdquo;</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>The service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot;.</li>
          <li>No warranties of any kind, express or implied.</li>
          <li>No guarantee of uninterrupted or error-free service.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">10.2 Data Accuracy</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Market data may be delayed or inaccurate.</li>
          <li>We rely on third-party data providers.</li>
          <li>We are not responsible for data errors or omissions.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">11. Limitation of Liability</h2>
        <p className="uppercase text-xs tracking-wider text-gray-500 dark:text-gray-400">To the maximum extent permitted by law:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>We are not liable for any indirect, incidental, or consequential damages.</li>
          <li>We are not liable for investment losses or trading decisions.</li>
          <li>Total liability is limited to the amount paid for subscription (not to exceed $200).</li>
          <li>Some jurisdictions do not allow these limitations.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">12. Indemnification</h2>
        <p>You agree to indemnify and hold Predixa harmless from:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Your use of the service.</li>
          <li>Your violation of these Terms.</li>
          <li>Your violation of any rights of another party.</li>
          <li>Your trading or investment decisions.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">13. Changes to Service</h2>
        <p>We reserve the right to:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Modify or discontinue features.</li>
          <li>Change subscription prices with notice.</li>
          <li>Update these Terms at any time.</li>
          <li>Notify users of material changes.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">14. Termination</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">14.1 By You</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Cancel subscription anytime through your online account or by contacting support.</li>
          <li>Access ends at the end of the billing period.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">14.2 By Us</h3>
        <p>We may suspend or terminate your account for:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Violation of these Terms.</li>
          <li>Fraudulent or illegal activity.</li>
          <li>Abuse of service or other users.</li>
          <li>Non-payment of subscription fees.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">14.3 Effect of Termination</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Your right to use the Platform immediately ceases.</li>
          <li>No refund of unused subscription time.</li>
          <li>Sections that should survive will remain in effect.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">15. Governing Law</h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>These Terms are governed by the laws of the State of Texas, United States.</li>
          <li>Disputes are resolved in courts of Texas.</li>
          <li>You waive the right to a jury trial.</li>
          <li>Exclusive jurisdiction resides in Texas courts.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">16. Dispute Resolution</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">16.1 Informal Resolution</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Contact us first to resolve disputes informally.</li>
          <li>
            Email:{' '}
            <a href="mailto:support@predixaweb.com" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              support@predixaweb.com
            </a>
          </li>
          <li>We will attempt resolution within 30 days.</li>
        </ul>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">16.2 Arbitration</h3>
        <ul className="ml-6 list-disc space-y-2">
          <li>Unresolved disputes are subject to binding arbitration.</li>
          <li>Arbitration is conducted under American Arbitration Association rules.</li>
          <li>Individual basis only (no class actions).</li>
          <li>Location: Texas.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">17. General Provisions</h2>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">17.1 Entire Agreement</h3>
        <p>These Terms constitute the entire agreement between you and Predixa.</p>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">17.2 Severability</h3>
        <p>If any provision is found invalid, the remaining provisions remain in effect.</p>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">17.3 No Waiver</h3>
        <p>Our failure to enforce any right does not constitute a waiver.</p>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">17.4 Assignment</h3>
        <p>You may not assign these Terms. We may assign to any successor.</p>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">17.5 Force Majeure</h3>
        <p>We are not liable for delays due to circumstances beyond our control.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">18. Contact Information</h2>
        <p>For questions about these Terms:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@predixaweb.com" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              support@predixaweb.com
            </a>
          </li>
          <li>
            <strong>Website:</strong> predixaweb.com
          </li>
        </ul>
      </section>

      <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-500/30 dark:bg-blue-500/10">
        <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100">19. Acknowledgment</h2>
        <ul className="ml-6 list-disc space-y-2 text-blue-900 dark:text-blue-100">
          <li>You have read and understood these Terms.</li>
          <li>You agree to be bound by these Terms.</li>
          <li>You understand the financial risks involved.</li>
          <li>You will not rely on the Platform for investment decisions.</li>
        </ul>
        <p className="mt-4 text-sm text-blue-900/80 dark:text-blue-100/80">
          These Terms of Service were last updated in January 2025. Continued use of the Platform after changes constitutes acceptance of the new Terms.
        </p>
      </section>
    </main>
  )
}

