import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'success',
    NODE_ENV: process.env.NODE_ENV,
    COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ? 'Set' : 'Missing',
    COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ? 'Set' : 'Missing',
    AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION ? 'Set' : 'Missing',
    COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ? 'Set' : 'Missing',
    IDENTITY_POOL_ID: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID ? 'Set' : 'Missing',
    timestamp: new Date().toISOString()
  })
}
