import { NextRequest, NextResponse } from 'next/server'
import { fetchAuthSession } from 'aws-amplify/auth'

/**
 * Entitlements API Route
 * 
 * Proxies requests to the Lambda entitlements API Gateway endpoint.
 * This route handles authentication and forwards the request with the Cognito JWT.
 * 
 * The Lambda function uses API Gateway Cognito Authorizer to validate the JWT.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the API Gateway URL from environment variables
    const entitlementsApiUrl = process.env.ENTITLEMENTS_API_GATEWAY_URL
    
    if (!entitlementsApiUrl) {
      console.error('ENTITLEMENTS_API_GATEWAY_URL is not configured')
      return NextResponse.json(
        { error: 'Entitlements API not configured' },
        { status: 500 }
      )
    }

    // Get the current user's session to extract JWT
    let idToken: string | null = null
    
    try {
      const session = await fetchAuthSession()
      idToken = session.tokens?.idToken?.toString() || null
    } catch (authError) {
      console.error('Error fetching auth session:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      )
    }

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

