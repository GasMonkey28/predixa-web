import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { StructuredData } from '@/components/layout/StructuredData'
import { GAPageView } from '@/components/GAPageView'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.predixaweb.com'
const siteName = 'Predixa'
const defaultDescription = 'Daily SPY forecasts with AI signals, direction probability, and tier rankings. Real-time options flow analysis and market analytics for active traders.'

// Force dynamic rendering for all pages - many use client components that cannot be statically generated
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SPY Forecast & AI Signals | Predixa',
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: [
    'SPY forecast',
    'SPY signals',
    'SPY trading',
    'SPY prediction',
    'SPY swing trading',
    'SPY day trading',
    'SPY options trading',
    'SPY ETF trading',
    'trading analytics',
    'market intelligence',
    'stock market analysis',
    'trading platform',
    'AI trading signals',
    'options flow analysis',
    'direction probability',
    'tier rankings',
    'market data',
    'economic calendar',
    'trading tools',
    'predict SPY',
    'stock market',
    'swing trading',
    'day trading',
    'trading signals',
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName,
    title: siteName,
    description: defaultDescription,
    images: [
      {
        url: `${siteUrl}/logo-large.jpg`,
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: defaultDescription,
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
  verification: {
    // Add verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-900 transition-colors">
        {gaId && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}', {
                    page_path: window.location.pathname
                  });
                `,
              }}
            />
          </>
        )}
        {gaId && <GAPageView />}
        <StructuredData />
        <ThemeProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}

