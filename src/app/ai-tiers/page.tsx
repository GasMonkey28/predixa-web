import type { Metadata } from 'next'
import Link from 'next/link'
import { createMetadata } from '@/lib/seo'

export const metadata: Metadata = createMetadata({
  title: 'SPY Tier System | SS Tier, S Tier, A Tier Explained | Predixa',
  description: 'Understand the SPY tier system (SS, S, A, B, C, D tiers). Learn what each tier means, how tiers update daily, and why tiers matter for trend strength.',
  path: '/ai-tiers',
})

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the SPY tier system?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The SPY tier system is a classification method that ranks SPY (SPDR S&P 500 ETF) price levels by their historical significance and probability of acting as support or resistance. Tiers range from SS (highest significance) to D (lowest significance), helping traders identify the most important price levels.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does SS tier mean?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SS tier represents the highest significance price levels for SPY. These are historically important levels that have shown strong support or resistance behavior. SS tier levels are most likely to influence price action and are given the highest weight in Predixa\'s analysis.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does S tier mean?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'S tier indicates very high significance price levels, second only to SS tier. S tier levels have demonstrated strong historical importance and are likely to act as significant support or resistance. These levels receive high weight in the tier system.',
      },
    },
    {
      '@type': 'Question',
      name: 'How often do SPY tiers update?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SPY tiers update daily to reflect new price action and changing market conditions. The tier system recalculates level significance based on recent trading activity, volume patterns, and historical performance. Updates typically occur before market open.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why do tiers matter for understanding trend strength?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Tiers help traders understand which price levels are most likely to influence SPY movement. Higher tier levels (SS, S) represent stronger support or resistance, indicating areas where trends may pause, reverse, or accelerate. Understanding tier strength helps assess trend sustainability and potential reversal points.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are A, B, C, and D tiers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A tier represents high significance levels, B tier indicates moderate significance, C tier shows lower significance, and D tier represents minimal significance. Lower tiers may still influence price action but with less reliability than higher tiers. The tier system helps prioritize which levels to watch most closely.',
      },
    },
  ],
}

export default function AITiersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-12 text-gray-700 dark:text-gray-300">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            SPY Tier System: Understanding SS, S, A, B, C, and D Tiers
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Learn how the SPY tier system works, what each tier means, and why tiers matter for understanding trend strength and identifying key support and resistance levels.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            What the SPY SS–D Tier System Is
          </h2>
          <p>
            The SPY tier system classifies price levels by their historical significance and probability of acting as support or resistance. Tiers range from SS (highest significance) to D (lowest significance), creating a hierarchy that helps traders identify which price levels are most likely to influence SPY movement.
          </p>
          <p>
            The system analyzes historical price action, volume patterns, and level performance to assign tier rankings. SS and S tiers represent the most important levels—those that have consistently shown strong support or resistance behavior. A and B tiers indicate high to moderate significance, while C and D tiers represent lower significance levels that may still influence price but with less reliability.
          </p>
          <p>
            This classification helps traders prioritize which levels to watch. Instead of treating all price levels equally, the tier system focuses attention on levels most likely to matter. Higher tier levels are given more weight in Predixa&apos;s analysis and forecasting models, reflecting their greater historical importance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            What Each Tier Means
          </h2>
          <p>
            <strong>SS Tier:</strong> The highest significance tier. SS tier levels have demonstrated exceptional historical importance, showing strong support or resistance behavior across multiple timeframes. These levels are most likely to influence price action and are given the highest weight in analysis. SS tier levels often correspond to major psychological levels, previous significant highs or lows, or areas where substantial volume has traded.
          </p>
          <p>
            <strong>S Tier:</strong> Very high significance, second only to SS tier. S tier levels have shown strong historical importance and are likely to act as significant support or resistance. These levels receive high weight in the tier system and are important for understanding potential price behavior.
          </p>
          <p>
            <strong>A Tier:</strong> High significance levels that have demonstrated notable importance. A tier levels may act as support or resistance but with slightly less reliability than S or SS tiers. These levels are still important for analysis and may influence price action, especially when combined with other factors.
          </p>
          <p>
            <strong>B Tier:</strong> Moderate significance levels. B tier levels may influence price action but with less consistency than higher tiers. These levels can still be useful for analysis, particularly when multiple B tier levels cluster together, creating a zone of potential support or resistance.
          </p>
          <p>
            <strong>C and D Tiers:</strong> Lower significance levels. C tier indicates lower significance, while D tier represents minimal significance. These tiers may still influence price action in some circumstances but are less reliable than higher tiers. Lower tier levels are typically given less weight in analysis but may become more relevant when price approaches them closely.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            How Tiers Update Daily
          </h2>
          <p>
            The tier system updates daily to reflect new price action and changing market conditions. Each day, the system recalculates level significance based on recent trading activity, volume patterns, and historical performance. Levels that gain importance through recent price action may be upgraded, while levels that lose relevance may be downgraded.
          </p>
          <p>
            The update process considers factors such as how price interacted with each level, whether levels held as support or resistance, volume at those levels, and the recency of level interactions. Levels that have been tested recently and held strong may maintain or increase their tier ranking. Levels that have been broken decisively may be downgraded or removed.
          </p>
          <p>
            Daily updates ensure the tier system remains current with market conditions. As SPY moves and new price action occurs, the system adapts to identify which levels are most relevant for current trading. This dynamic approach helps traders focus on levels that matter now, not just historically.
          </p>
          <p>
            Updates typically occur before market open, incorporating overnight data and pre-market activity. The system processes the previous day&apos;s trading to update tier rankings, ensuring traders have current information when markets open. This daily refresh keeps the tier system aligned with evolving market structure.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Why Tiers Matter for Understanding Trend Strength
          </h2>
          <p>
            Tiers help traders understand which price levels are most likely to influence SPY movement, which in turn helps assess trend strength. When SPY approaches a high-tier level (SS or S), the interaction provides information about trend sustainability. If price respects a high-tier resistance level, it may indicate trend weakness. If price breaks through decisively, it may signal trend continuation.
          </p>
          <p>
            Trend strength can be assessed by observing how price behaves at tier levels. Strong trends often break through lower-tier levels with relative ease but may pause or reverse at higher-tier levels. Weak trends may struggle even at lower-tier levels, suggesting limited momentum. The tier system helps identify these patterns.
          </p>
          <p>
            Clustering of tier levels can also indicate trend strength. When multiple high-tier levels cluster together, they create a zone of potential support or resistance. Breaking through such a zone may signal significant trend continuation, while failing to break through may indicate trend exhaustion. Understanding tier clustering helps assess trend sustainability.
          </p>
          <p>
            The tier system also helps identify potential reversal points. High-tier levels that have acted as support may become resistance if broken, or vice versa. Understanding tier significance helps traders anticipate where trends might pause, reverse, or accelerate. This information is valuable for risk management and position planning.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            How Predixa Builds the Tiers
          </h2>
          <p>
            Predixa builds the tier system using a combination of historical analysis, volume profiling, and machine learning techniques. The system analyzes years of SPY price data to identify levels that have consistently shown support or resistance behavior. Historical performance is weighted by recency, with more recent interactions given greater importance.
          </p>
          <p>
            Volume analysis helps identify levels where significant trading activity has occurred. High-volume areas often correspond to important price levels, and the tier system incorporates volume data to assess level significance. Levels with substantial historical volume are more likely to receive higher tier rankings.
          </p>
          <p>
            Machine learning models help identify patterns that may not be obvious through simple historical analysis. The system learns which characteristics—such as level age, interaction frequency, volume patterns, or proximity to round numbers—correlate with level importance. This adaptive approach helps the tier system improve over time.
          </p>
          <p>
            The system also considers market context. During trending markets, levels in the direction of the trend may gain importance. During range-bound markets, levels at range boundaries may become more significant. The tier system adapts to current market conditions while maintaining focus on historically important levels.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-900/50">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Explore More SPY Analytics
          </h2>
          <nav className="flex flex-wrap gap-4">
            <Link
              href="/spy-forecast"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              SPY Forecast
            </Link>
            <Link
              href="/spy-signals"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              SPY Signals
            </Link>
            <Link
              href="/ai-tiers"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              AI Tiers
            </Link>
            <Link
              href="/options-flow"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Options Flow
            </Link>
            <Link
              href="/range-forecast"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Range Forecast
            </Link>
            <Link
              href="/pricing"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              About
            </Link>
          </nav>
        </section>
      </main>
    </>
  )
}

