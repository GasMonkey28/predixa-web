import { NextRequest, NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/lib/constants'
import { config } from '@/lib/server/config'

function extractIdToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (sessionCookie) {
    return sessionCookie
  }

  const clientId =
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ||
    process.env.COGNITO_CLIENT_ID ||
    ''

  const candidateNames = [
    clientId ? `CognitoIdentityServiceProvider.${clientId}.idToken` : null,
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
  try {
    // Get the API Gateway URL from environment variables
    const entitlementsApiUrl = config.entitlements.apiGatewayUrl
    
    if (!entitlementsApiUrl) {
      console.error('ENTITLEMENTS_API_GATEWAY_URL is not configured')
      return NextResponse.json(
        { error: 'Entitlements API not configured' },
        { status: 500 }
      )
    }

    // Get the current user's session to extract JWT
    const idToken = extractIdToken(request)

    if (!idToken) {
      return NextResponse.json(
        { error: 'Unauthorized - no authentication token' },
        { status: 401 }
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
      console.error(`Entitlements API error (${response.status}):`, errorText)
      
      // If 401, user is not authenticated
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized - invalid token' },
          { status: 401 }
        )
      }
      
      // For other errors, return the error from the API
      return NextResponse.json(
        { error: errorText || 'Failed to fetch entitlements' },
        { status: response.status }
      )
    }

    const entitlements = await response.json()
    
    return NextResponse.json(entitlements)
  } catch (error: any) {
    console.error('Error in entitlements API route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

