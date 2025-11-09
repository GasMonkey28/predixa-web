import { NextRequest, NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/lib/constants'
import { verifyCognitoToken } from '@/lib/server/cognito-token'

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token.trim()
}

function buildCookieOptions(maxAge: number) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Missing Authorization bearer token' },
        { status: 400 }
      )
    }

    const payload = await verifyCognitoToken(token)
    const now = Math.floor(Date.now() / 1000)
    const expiresInSeconds =
      typeof payload.exp === 'number' ? Math.max(payload.exp - now, 0) : 3600

    const response = NextResponse.json({ ok: true })
    response.cookies.set({
      ...buildCookieOptions(expiresInSeconds),
      value: token,
    })
    return response
  } catch (error) {
    console.error('Failed to persist session cookie:', error)
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    ...buildCookieOptions(0),
    value: '',
  })
  return response
}

