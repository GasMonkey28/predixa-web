import { NextRequest } from 'next/server'

import { extractIdToken, getUserIdFromToken } from '@/lib/server/cognito-request-auth'
import { config } from '@/lib/server/config'
import { logger } from '@/lib/server/logger'

export type SubscriberAuthResult =
  | { ok: true; userId: string; idToken: string }
  | { ok: false; status: 401 | 403; error: string }

/**
 * Require a Cognito id token and an active Predixa subscription (access_granted).
 * Fail closed if entitlements cannot be verified.
 */
export async function requireSubscriber(request: NextRequest): Promise<SubscriberAuthResult> {
  const idToken = extractIdToken(request)
  if (!idToken) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const userId = getUserIdFromToken(idToken)
  if (!userId) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const entitlementsApiUrl = config.entitlements.apiGatewayUrl
  if (!entitlementsApiUrl) {
    logger.warn({ userId }, 'Entitlements API not configured; denying ranks access')
    return { ok: false, status: 403, error: 'Subscription required' }
  }

  try {
    const response = await fetch(entitlementsApiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: 401, error: 'Unauthorized' }
    }

    if (!response.ok) {
      logger.warn(
        { userId, status: response.status },
        'Entitlements check failed for subscriber gate'
      )
      return { ok: false, status: 403, error: 'Subscription required' }
    }

    const entitlements = (await response.json()) as { access_granted?: boolean }
    if (!entitlements?.access_granted) {
      return { ok: false, status: 403, error: 'Subscription required' }
    }

    return { ok: true, userId, idToken }
  } catch (error) {
    logger.error(
      { userId, error, message: (error as Error)?.message },
      'Entitlements check error for subscriber gate'
    )
    return { ok: false, status: 403, error: 'Subscription required' }
  }
}
