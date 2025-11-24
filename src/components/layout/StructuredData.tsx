const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.predixaweb.com'
const siteName = 'Predixa'
const defaultDescription = 'Professional Trading Analytics Platform - Intraday levels, curated commentary, and economic context built for active traders.'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: siteUrl,
  logo: `${siteUrl}/logo-large.jpg`,
  description: defaultDescription,
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'support@predixaweb.com',
    contactType: 'Customer Service',
  },
  sameAs: [
    // Add social media profiles when available
    // 'https://twitter.com/predixa',
    // 'https://linkedin.com/company/predixa',
  ],
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  url: siteUrl,
  description: defaultDescription,
  publisher: {
    '@type': 'Organization',
    name: siteName,
  },
}

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteName,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '19.99',
    priceCurrency: 'USD',
  },
  description: defaultDescription,
  url: siteUrl,
}

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
    </>
  )
}

