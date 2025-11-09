import { NextRequest, NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/lib/constants'
import { config } from '@/lib/server/config'
import { verifyCognitoToken } from '@/lib/server/cognito-token'

// Define protected routes that require authentication
const protectedRoutes = ['/daily', '/weekly', '/future', '/account']

// Define routes that require active subscription (not just authentication)
const subscriptionRequiredRoutes = ['/daily', '/weekly', '/future']

// Account page is accessible to authenticated users (for subscription management)
const accountRoute = '/account'

/**
 * Check subscription status via entitlements API.
 * Returns true if user has active subscription or trial.
 */
async function checkSubscriptionStatus(idToken: string): Promise<boolean> {
  try {
    const entitlementsApiUrl = config.entitlements.apiGatewayUrl
    
    if (!entitlementsApiUrl) {
      // If entitlements API is not configured, allow access (graceful degradation)
      console.warn('ENTITLEMENTS_API_GATEWAY_URL not configured, skipping subscription check')
      return true
    }

    const response = await fetch(entitlementsApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      // If API returns 401, user is not authenticated (shouldn't happen here)
      // If other error, allow access but log warning
      console.warn(`Entitlements API error: ${response.status}`)
      return false
    }

    const entitlements = await response.json()
    const status = entitlements.status || 'none'
    
    // Allow access for 'active' or 'trialing' status
    return status === 'active' || status === 'trialing'
  } catch (error) {
    console.error('Error checking subscription status:', error)
    // On error, deny access (fail secure)
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for home page to allow OAuth callbacks
  if (pathname === '/') {
    return NextResponse.next()
  }
  
  // Skip API routes (they handle their own auth)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // If it's not a protected route, allow access (no auth check needed)
  if (!isProtectedRoute) {
    return NextResponse.next()
  }
  
  // Check authentication for protected routes
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (!sessionCookie) {
      console.log('Middleware: No session cookie found, redirecting to home')
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    try {
      await verifyCognitoToken(sessionCookie)
    } catch (error) {
      console.warn('Middleware: Invalid session cookie, redirecting to home', error)
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Account page: only requires authentication (no subscription check)
    if (pathname.startsWith(accountRoute)) {
      console.log('Middleware: User is authenticated, allowing access to account page')
      return NextResponse.next()
    }
    
    // Subscription-required routes: check subscription status
    const requiresSubscription = subscriptionRequiredRoutes.some(route => 
      pathname.startsWith(route)
    )
    
    if (requiresSubscription) {
      const hasActiveSubscription = await checkSubscriptionStatus(sessionCookie)
      
      if (!hasActiveSubscription) {
        console.log('Middleware: User does not have active subscription, redirecting to account')
        // Redirect to account page where they can subscribe
        return NextResponse.redirect(new URL('/account?subscription_required=true', request.url))
      }
      
      console.log('Middleware: User has active subscription, allowing access')
    }
    
    // User is authenticated (and has subscription if required), allow access
    return NextResponse.next()
    
  } catch (error) {
    console.error('Middleware: Error checking authentication:', error)
    // If there's an error checking auth, redirect to home
    return NextResponse.redirect(new URL('/', request.url))
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
