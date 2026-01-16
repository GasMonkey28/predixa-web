const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: process.env.NEXT_PUBLIC_S3_BUCKET 
      ? [`${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.amazonaws.com`]
      : [],
  },
  env: {
    // These are now set via environment variables (.env.local or Vercel)
    // NEXT_PUBLIC_S3_BUCKET should be set in your environment
    // NEXT_PUBLIC_TICKER defaults to 'SPY' if not set
    NEXT_PUBLIC_TICKER: process.env.NEXT_PUBLIC_TICKER || 'SPY',
  },
  // Disable static optimization to prevent build errors with client components
  // Pages will be rendered on-demand instead of at build time
  experimental: {
    dynamicIO: true,
  },
  // Allow app to build even if some env vars are missing (they'll fail gracefully at runtime)
  webpack: (config) => {
    return config
  },
}

const sentryWebpackPluginOptions = {
  silent: true,
}

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig
