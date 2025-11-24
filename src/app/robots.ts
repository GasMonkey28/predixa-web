import { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.predixaweb.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/daily', '/weekly', '/future', '/account'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}

