/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['tradespark-822233328169-us-east-1.s3.amazonaws.com'],
  },
  env: {
    NEXT_PUBLIC_S3_BUCKET: 'tradespark-822233328169-us-east-1',
    NEXT_PUBLIC_TICKER: 'SPY',
  },
}

module.exports = nextConfig
