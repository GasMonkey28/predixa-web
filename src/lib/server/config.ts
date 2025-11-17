type NonEmptyString = string & { readonly brand: unique symbol }

function requireEnv(name: string, value: string | undefined | null): NonEmptyString {
  if (!value || value.trim().length === 0) {
    throw new Error(`Environment variable ${name} is required but was not provided.`)
  }
  return value.trim() as NonEmptyString
}

const _config = (() => {
  const env = process.env

  const awsRegion =
    env.NEXT_PUBLIC_AWS_REGION ||
    env.AWS_REGION ||
    env.COGNITO_REGION ||
    ''
  const cognitoUserPoolId =
    env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
    env.COGNITO_USER_POOL_ID ||
    ''
  const cognitoClientId =
    env.NEXT_PUBLIC_COGNITO_CLIENT_ID ||
    env.COGNITO_CLIENT_ID ||
    ''

  return {
    aws: {
      region: requireEnv('NEXT_PUBLIC_AWS_REGION (or AWS_REGION/COGNITO_REGION)', awsRegion),
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    cognito: {
      userPoolId: requireEnv('NEXT_PUBLIC_COGNITO_USER_POOL_ID (or COGNITO_USER_POOL_ID)', cognitoUserPoolId),
      clientId: requireEnv('NEXT_PUBLIC_COGNITO_CLIENT_ID (or COGNITO_CLIENT_ID)', cognitoClientId),
      domain: requireEnv('NEXT_PUBLIC_COGNITO_DOMAIN', env.NEXT_PUBLIC_COGNITO_DOMAIN),
      identityPoolId: env.NEXT_PUBLIC_IDENTITY_POOL_ID || undefined,
    },
    entitlements: {
      apiGatewayUrl: env.ENTITLEMENTS_API_GATEWAY_URL || null,
      tableName: env.ENTITLEMENTS_TABLE || 'predixa_entitlements',
    },
    stripe: {
      secretKey: requireEnv('STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY),
      publishableKey: requireEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      priceIdMonthly: env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || null,
      priceIdYearly: env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || null,
    },
    marketData: {
      bucket: requireEnv('NEXT_PUBLIC_S3_BUCKET', env.NEXT_PUBLIC_S3_BUCKET),
      ticker: env.NEXT_PUBLIC_TICKER || 'SPY',
    },
    proxies: {
      scraperApiKey: env.SCRAPER_API_KEY || null,
      customProxyUrl: env.CUSTOM_PROXY_URL || null,
    },
    fred: {
      apiKey: env.FRED_API_KEY || null,
    },
  }
})()

export type AppConfig = typeof _config

export const config: AppConfig = _config


