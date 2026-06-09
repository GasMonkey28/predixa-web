import { NextRequest } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/lib/constants'
import { config } from '@/lib/server/config'

export function extractIdToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (sessionCookie) return sessionCookie

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

export function getUserIdFromToken(idToken: string): string | null {
  try {
    const payload = idToken.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string }
    return decoded.sub || null
  } catch {
    return null
  }
}

export function requireUserId(request: NextRequest): string | null {
  const idToken = extractIdToken(request)
  if (!idToken) return null
  return getUserIdFromToken(idToken)
}
