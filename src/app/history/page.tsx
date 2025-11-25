import { Metadata } from 'next'
import HistoryPageContent from './HistoryPageContent'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.predixaweb.com'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'SPY Trading History & Tier Rankings | Predixa',
    description:
      'View SPY trading history with daily OHLC data, tier rankings, and prediction accuracy. Analyze last 10 trading days with long/short tier signals and compensation tracking.',
    keywords: [
      'SPY history',
      'trading history',
      'SPY tier rankings',
      'OHLC data',
      'trading signals',
      'prediction accuracy',
      'SPY analysis',
      'trading performance',
      'market history',
      'tier system',
      'SPY candlestick chart',
      'daily trading data',
      'tier signals',
      'long short tiers',
      'trading predictions',
    ],
    alternates: {
      canonical: `${siteUrl}/history`,
    },
    openGraph: {
      title: 'SPY Trading History & Tier Rankings | Predixa',
      description:
        'View SPY trading history with daily OHLC data, tier rankings, and prediction accuracy. Analyze last 10 trading days with long/short tier signals.',
      url: `${siteUrl}/history`,
      type: 'website',
      siteName: 'Predixa',
      images: [
        {
          url: `${siteUrl}/logo-large.jpg`,
          width: 1200,
          height: 630,
          alt: 'SPY Trading History | Predixa',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'SPY Trading History & Tier Rankings | Predixa',
      description:
        'View SPY trading history with daily OHLC data, tier rankings, and prediction accuracy.',
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

// Generate structured data for SEO
function generateStructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Predixa',
    url: siteUrl,
    logo: `${siteUrl}/logo-large.jpg`,
    description:
      'Predixa provides AI-powered trading analytics, market forecasts, and trading history analysis for SPY and other ETFs.',
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
        name: 'History',
        item: `${siteUrl}/history`,
      },
    ],
  }

  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'SPY Trading History',
    description:
      'Historical SPY trading data with OHLC prices, tier rankings, and prediction accuracy for the last 10 trading days',
    url: `${siteUrl}/history`,
    creator: {
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
    datePublished: new Date().toISOString(),
    keywords: [
      'SPY',
      'trading history',
      'OHLC',
      'tier rankings',
      'trading signals',
      'prediction accuracy',
    ],
    about: {
      '@type': 'Thing',
      name: 'SPY ETF',
      description: 'SPDR S&P 500 ETF Trust',
    },
  }

  return { organizationSchema, breadcrumbSchema, datasetSchema }
}

export default function HistoryPage() {
  const { organizationSchema, breadcrumbSchema, datasetSchema } =
    generateStructuredData()

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
      {/* Dataset Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(datasetSchema),
        }}
      />
      <ProtectedRoute requireSubscription>
        <HistoryPageContent />
      </ProtectedRoute>
    </>
  )
}

