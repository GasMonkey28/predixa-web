import { NextRequest, NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/lib/constants'
import { config } from '@/lib/server/config'
import { verifyCognitoToken } from '@/lib/server/cognito-token'

// Define protected routes that require authentication
// NOTE: /news is intentionally NOT in this list - news page is always free for everyone
const protectedRoutes = ['/daily', '/weekly', '/future', '/history', '/account']

// Define routes that require active subscription (not just authentication)
// NOTE: /news is intentionally NOT in this list - news page is always free for everyone
const subscriptionRequiredRoutes = ['/daily', '/weekly', '/future', '/history']

// Account page is accessible to authenticated users (for subscription management)
const accountRoute = '/account'

/**
 * Check if the request is from a search engine crawler.
 * This allows search engines to index protected pages for SEO.
 */
function isSearchEngineCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  
  const crawlers = [
    'googlebot',
    'google-inspectiontool', // Google Search Console URL Inspection
    'bingbot',
    'slurp', // Yahoo
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'sogou',
    'exabot',
    'facebot', // Facebook
    'ia_archiver', // Alexa
    'msnbot',
    'ahrefsbot',
    'semrushbot',
    'applebot', // Apple
    'petalbot', // Huawei
  ]
  
  const lowerUserAgent = userAgent.toLowerCase()
  return crawlers.some(crawler => lowerUserAgent.includes(crawler))
}

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
    
    // Check access_granted first (this is the authoritative field)
    // It correctly handles expired trials (status="trialing" but trial_active=false)
    if (entitlements.access_granted === true) {
      return true
    }
    
    // Fallback: Allow access for 'active' status or active trialing
    // Note: status="trialing" alone is not enough - must also have trial_active=true
    const isActiveTrialing = status === 'trialing' && entitlements.trial_active === true
    return status === 'active' || isActiveTrialing
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
  
  // Skip SEO files - Next.js handles these specially
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    return NextResponse.next()
  }
  
  // Check if the request is from a search engine crawler
  const userAgent = request.headers.get('user-agent')
  const isCrawler = isSearchEngineCrawler(userAgent)
  
  // Allow search engine crawlers to access all routes for SEO indexing
  // This bypasses both authentication and subscription checks
  if (isCrawler) {
    console.log('Middleware: Search engine crawler detected, allowing access for SEO:', userAgent)
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
     * - robots.txt (SEO file)
     * - sitemap.xml (SEO file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public).*)',
  ],
}
