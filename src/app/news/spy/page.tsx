/**
 * SPY News & Predixa AI Briefing Page
 * 
 * Server-side rendered page that:
 * - Fetches SPY news from Massive.com API
 * - Generates AI-powered briefing using OpenAI
 * - Renders SEO-optimized HTML
 * - Auto-refreshes every 10 minutes via Next.js revalidation
 * 
 * Environment variables required:
 * - MASSIVE_API_KEY: Massive.com API key
 * - OPENAI_API_KEY: OpenAI API key
 * 
 * Set in .env.local (development) or Vercel environment variables (production).
 */

import { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchSpyNews } from './newsClient'
import { generatePredixaBriefing } from './briefingClient'
import BriefingSection from './BriefingSection'

// Revalidate every 10 minutes (600 seconds)
// This means the page will automatically refresh with new data
// without requiring a manual rebuild
export const revalidate = 600

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.predixaweb.com'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'SPY News & AI Market Briefing | Predixa',
    description:
      "Daily SPY news with Predixa's AI-powered briefing summarizing ETF and macro headlines in a few bullets.",
    keywords: [
      'SPY news',
      'S&P 500 news',
      'SPY ETF news',
      'market briefing',
      'AI market analysis',
      'stock market news',
      'ETF news',
      'financial news',
      'market sentiment',
      'trading news',
      'SPY analysis',
      'market headlines',
      'daily market briefing',
      'financial markets',
      'stock market updates',
    ],
    alternates: {
      canonical: `${siteUrl}/news/spy`,
    },
    openGraph: {
      title: 'SPY News & AI Market Briefing | Predixa',
      description:
        "Daily SPY news with Predixa's AI-powered briefing summarizing ETF and macro headlines in a few bullets.",
      url: `${siteUrl}/news/spy`,
      type: 'website',
      siteName: 'Predixa',
      images: [
        {
          url: `${siteUrl}/logo-large.jpg`,
          width: 1200,
          height: 630,
          alt: 'SPY News & AI Market Briefing | Predixa',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'SPY News & AI Market Briefing | Predixa',
      description:
        "Daily SPY news with Predixa's AI-powered briefing summarizing ETF and macro headlines in a few bullets.",
      images: [`${siteUrl}/logo-large.jpg`],
      creator: '@predixa',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })
  } catch {
    return dateString
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  } catch {
    return dateString
  }
}

export default async function SpyNewsPage() {
  let articles: Awaited<ReturnType<typeof fetchSpyNews>> = []
  let briefing: Awaited<ReturnType<typeof generatePredixaBriefing>> | null = null
  let newsError: string | null = null
  let briefingError: string | null = null

  // Fetch news articles first (non-blocking for briefing)
  // This allows the page to render immediately with news articles
  try {
    articles = await fetchSpyNews()
  } catch (error) {
    newsError =
      error instanceof Error ? error.message : 'Failed to load SPY news'
    console.error('Error fetching news:', error)
  }

  // Try to get briefing, but don't block page render if it fails
  // BriefingSection will handle async loading if initial briefing is null
  if (articles.length > 0) {
    try {
      // Attempt to get briefing, but catch errors gracefully
      briefing = await generatePredixaBriefing(articles, 'pro').catch(() => null)
    } catch (error) {
      // Briefing will load async in BriefingSection - don't block page render
      briefingError =
        error instanceof Error
          ? error.message
          : 'Failed to generate briefing'
      console.error('Error generating briefing (non-blocking):', error)
    }
  }

  // Get latest article timestamp for "last updated" display
  const lastUpdated =
    articles.length > 0
      ? articles[0].publishedUtc
      : new Date().toISOString()

  // Generate comprehensive JSON-LD structured data for SEO
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Predixa',
    url: siteUrl,
    logo: `${siteUrl}/logo-large.jpg`,
    description:
      'Predixa provides AI-powered trading analytics, market forecasts, and financial news briefings for SPY and other ETFs.',
    sameAs: [
      'https://twitter.com/Predixa28',
      'https://www.instagram.com/predixa',
      'https://www.youtube.com/@predixa28',
      'https://www.tiktok.com/@predixa',
    ],
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'News',
        item: `${siteUrl}/news/spy`,
      },
    ],
  }

  const articleListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'SPY News Headlines',
    description: 'Latest SPY (S&P 500 ETF) news articles',
    itemListElement: articles.slice(0, 10).map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.description,
        publisher: {
          '@type': 'Organization',
          name: article.publisherName,
        },
        datePublished: article.publishedUtc,
        url: article.url,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': article.url,
        },
      },
    })),
  }

  // Article schema for the AI briefing section
  const briefingArticleSchema = briefing
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Predixa AI Briefing for SPY',
        description: briefing.daily_brief.join(' '),
        author: {
          '@type': 'Organization',
          name: 'Predixa',
          url: siteUrl,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Predixa',
          logo: {
            '@type': 'ImageObject',
            url: `${siteUrl}/logo-large.jpg`,
          },
        },
        datePublished: lastUpdated,
        dateModified: lastUpdated,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${siteUrl}/news/spy`,
        },
        keywords: briefing.themes.join(', '),
        articleSection: 'Financial News',
        about: {
          '@type': 'Thing',
          name: 'SPY ETF',
          description: 'SPDR S&P 500 ETF Trust',
        },
      }
    : null

  return (
    <>
      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      {/* Article List Schema */}
      {articles.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleListSchema),
          }}
        />
      )}
      {/* Briefing Article Schema */}
      {briefingArticleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(briefingArticleSchema),
          }}
        />
      )}
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="relative mx-auto max-w-6xl px-6 py-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-4xl font-bold text-transparent">
              SPY News & Predixa AI Briefing
            </h1>
            <p className="text-sm text-gray-400">
              Updated: {formatDate(lastUpdated)} · Auto-refreshed every 10–60
              minutes
            </p>
          </div>

          {/* Error Messages */}
          {newsError && (
            <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-400">
              <p className="font-semibold">Unable to load news</p>
              <p className="text-sm">{newsError}</p>
              <p className="mt-2 text-sm">
                Please try again later or check your API configuration.
              </p>
            </div>
          )}

          {/* Predixa Briefing Section - Load async with Suspense */}
          <Suspense
            fallback={
              <div className="mb-8 rounded-2xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-6 backdrop-blur-sm">
                <div className="mb-4 h-8 w-64 animate-pulse rounded bg-zinc-800"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-800"></div>
                  ))}
                </div>
              </div>
            }
          >
            {briefingError ? (
              <div className="mb-8 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-yellow-400">
                <p className="font-semibold">Briefing temporarily unavailable</p>
                <p className="text-sm">
                  {briefingError}. Raw headlines are shown below.
                </p>
              </div>
            ) : (
              <BriefingSection
                initialBriefing={briefing}
                initialMode="pro"
                articlesCount={articles.length}
              />
            )}
          </Suspense>

          {/* Latest SPY Headlines Section */}
          <div className="rounded-2xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-6 backdrop-blur-sm">
            <h2 className="mb-6 text-2xl font-bold text-white">
              Latest SPY Headlines
            </h2>

            {articles.length === 0 ? (
              <p className="text-gray-400">
                No news articles available at this time.
              </p>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <article
                    key={article.id}
                    className="rounded-lg border border-zinc-800/30 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700/50 hover:bg-zinc-900/70"
                  >
                    <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                      <span className="font-medium">{article.publisherName}</span>
                      <span>·</span>
                      <time dateTime={article.publishedUtc}>
                        {formatRelativeTime(article.publishedUtc)}
                      </time>
                    </div>

                    <h3 className="mb-2">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold text-blue-400 transition-colors hover:text-blue-300"
                      >
                        {article.title}
                      </a>
                    </h3>

                    {article.description && (
                      <p className="mb-3 text-sm text-gray-300">
                        {article.description}
                      </p>
                    )}

                    {/* Tags */}
                    {(article.tickers.length > 0 ||
                      article.keywords.length > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {article.tickers.map((ticker) => (
                          <span
                            key={ticker}
                            className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400"
                          >
                            {ticker}
                          </span>
                        ))}
                        {article.keywords.slice(0, 3).map((keyword, index) => (
                          <span
                            key={index}
                            className="rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-xs text-gray-400"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* How it works section */}
          <div className="mt-8 rounded-lg border border-zinc-800/30 bg-zinc-900/30 p-4 text-sm text-gray-400">
            <p className="font-semibold text-gray-300">How we generate this briefing</p>
            <p className="mt-2">
              Predixa uses AI to analyze the latest SPY news from top financial
              publishers, summarizing key market-moving headlines into concise
              insights. Our briefing updates automatically throughout the day to
              keep you informed.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}

