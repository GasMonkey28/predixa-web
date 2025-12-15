import { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.predixaweb.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Only disallow /account as it's user-specific
        // /daily, /weekly, /future are now allowed for SEO (crawlers can access via middleware)
        disallow: ['/account'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}

