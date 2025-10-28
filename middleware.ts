import { NextRequest, NextResponse } from 'next/server'
import { fetchAuthSession } from 'aws-amplify/auth'

// Define protected routes that require authentication
const protectedRoutes = [
  '/daily',
  '/weekly',
  '/future',
  '/account'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for home page to allow OAuth callbacks
  if (pathname === '/') {
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
  
  // Only check authentication for protected routes
  try {
    // Check if user is authenticated using Amplify
    const session = await fetchAuthSession()
    
    // If no session or no tokens, redirect to home page
    if (!session || !session.tokens || !session.tokens.idToken) {
      console.log('Middleware: No valid session found, redirecting to home')
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // User is authenticated, allow access
    console.log('Middleware: User is authenticated, allowing access')
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
