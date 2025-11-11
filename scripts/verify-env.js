/**
 * Minimal runtime guard to ensure critical environment variables are present
 * before Next.js builds. Mirrors the validations inside src/lib/server/config.ts.
 */
const requiredVars = [
  'NEXT_PUBLIC_AWS_REGION',
  'NEXT_PUBLIC_COGNITO_USER_POOL_ID',
  'NEXT_PUBLIC_COGNITO_CLIENT_ID',
  'NEXT_PUBLIC_COGNITO_DOMAIN',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_S3_BUCKET',
]

const optionalButRecommended = [
  'ENTITLEMENTS_API_GATEWAY_URL',
  'NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY',
  'NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY',
  'NEXT_PUBLIC_IDENTITY_POOL_ID',
  'SCRAPER_API_KEY',
  'CUSTOM_PROXY_URL',
  'FRED_API_KEY',
  'SENTRY_DSN',
  'SENTRY_ENVIRONMENT',
  'SENTRY_TRACES_SAMPLE_RATE',
  'RATE_LIMIT_REQUESTS_PER_WINDOW',
  'RATE_LIMIT_WINDOW_MS',
]

function checkVars(names, { required }) {
  const missing = names.filter((name) => {
    const value = process.env[name]
    return !value || String(value).trim().length === 0
  })

  if (missing.length > 0) {
    const list = missing.map((name) => ` • ${name}`).join('\n')
    if (required) {
      throw new Error(
        `Missing required environment variables:\n${list}\n` +
          'Populate them via your deployment provider or a local .env file.'
      )
    } else {
      console.warn(
        `Warning: recommended environment variables are missing:\n${list}\n` +
          'Functionality may be limited until they are provided.'
      )
    }
  }
}

try {
  checkVars(requiredVars, { required: true })
  checkVars(optionalButRecommended, { required: false })
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

