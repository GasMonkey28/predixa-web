import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.predixaweb.com'
const siteName = 'Predixa'
const defaultDescription = 'Professional Trading Analytics Platform for SPY trading, swing trading, and stock market analysis. Predict SPY movement with AI-powered signals, forecasts, and trading analytics for active traders.'

export function getSiteUrl(path: string = ''): string {
  return `${siteUrl}${path}`
}

export function createMetadata({
  title,
  description = defaultDescription,
  path = '',
  image,
  noIndex = false,
}: {
  title: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
}): Metadata {
  const url = getSiteUrl(path)
  const ogImage = image || getSiteUrl('/logo-large.jpg')

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
      },
    },
  }
}

