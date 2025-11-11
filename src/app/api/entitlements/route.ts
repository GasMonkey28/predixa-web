import { NextRequest, NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/lib/constants'
import { config } from '@/lib/server/config'
import { logger } from '@/lib/server/logger'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'

function extractIdToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (sessionCookie) {
    return sessionCookie
  }

  const candidateNames = [
    config.cognito.clientId ? `CognitoIdentityServiceProvider.${config.cognito.clientId}.idToken` : null,
    'CognitoIdentityServiceProvider.undefined.idToken',
  ].filter(Boolean) as string[]

  for (const name of candidateNames) {
    const value = request.cookies.get(name)?.value
    if (value) return value
  }

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes('idToken') && cookie.value) {
      return cookie.value
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  const clientIp =
    (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'anonymous'

  if (!checkRateLimit(clientIp)) {
    logger.warn({ ip: clientIp }, 'Entitlements rate limit exceeded')
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: getRateLimitHeaders(clientIp),
      }
    )
  }

  try {
    // Get the API Gateway URL from environment variables
    const entitlementsApiUrl = config.entitlements.apiGatewayUrl
    
    if (!entitlementsApiUrl) {
      logger.warn('Entitlements API gateway URL not configured; returning default access=false')
      return NextResponse.json(
        {
          status: 'none',
          access_granted: false,
          plan: null,
          trial_active: false,
        },
        { headers: getRateLimitHeaders(clientIp) }
      )
    }

    // Get the current user's session to extract JWT
    const idToken = extractIdToken(request)

    if (!idToken) {
      logger.warn({ ip: clientIp }, 'Entitlements request without authentication token')
      return NextResponse.json(
        { error: 'Unauthorized - no authentication token' },
        { status: 401, headers: getRateLimitHeaders(clientIp) }
      )
    }

    // Call the Lambda entitlements API via API Gateway
    const response = await fetch(entitlementsApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      // Don't cache this response - subscription status changes frequently
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ status: response.status, error: errorText }, 'Entitlements API returned error')
      
      // If 401, user is not authenticated
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized - invalid token' },
          { status: 401, headers: getRateLimitHeaders(clientIp) }
        )
      }
      
      // For other errors, return the error from the API
      return NextResponse.json(
        { error: errorText || 'Failed to fetch entitlements' },
        { status: response.status, headers: getRateLimitHeaders(clientIp) }
      )
    }

    const entitlements = await response.json()
    logger.info(
      {
        status: entitlements?.status,
        accessGranted: entitlements?.access_granted,
        plan: entitlements?.plan,
      },
      'Entitlements retrieved successfully'
    )
    
    return NextResponse.json(entitlements, { headers: getRateLimitHeaders(clientIp) })
  } catch (error: any) {
    logger.error({ error }, 'Error in entitlements API route')
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}

