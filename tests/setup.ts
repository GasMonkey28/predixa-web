process.env.NEXT_PUBLIC_AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID =
  process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_dummy'
process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || 'dummy_client'
process.env.NEXT_PUBLIC_COGNITO_DOMAIN =
  process.env.NEXT_PUBLIC_COGNITO_DOMAIN || 'dummy.auth.us-east-1.amazoncognito.com'
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy'
process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || 'price_monthly_dummy'
process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || 'price_yearly_dummy'
process.env.ENTITLEMENTS_API_GATEWAY_URL =
  process.env.ENTITLEMENTS_API_GATEWAY_URL || 'https://example.com/entitlements'
process.env.NEXT_PUBLIC_S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || 'test-bucket'
process.env.NEXT_PUBLIC_TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'

