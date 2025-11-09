import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { Amplify } from 'aws-amplify'
import { fetchAuthSession } from 'aws-amplify/auth'
import { decodeJwt } from 'jose'

import { config } from '@/lib/server/config'

// Configure Amplify for server-side use if not already configured
if (!Amplify.getConfig().Auth) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.cognito.userPoolId,
        userPoolClientId: config.cognito.clientId,
      },
    },
  })
}

/**
 * Extract user info from request cookies/headers
 * Since API routes don't have access to browser storage, we need to get tokens from cookies
 */
async function getUserFromRequest(request: NextRequest): Promise<{ userId: string; email: string } | null> {
  try {
    const cookies = request.cookies
    const clientId = config.cognito.clientId
    
    // Try multiple cookie name patterns that Amplify might use
    let idToken: string | undefined
    
    // Pattern 1: CognitoIdentityServiceProvider.{clientId}.idToken
    if (clientId) {
      idToken = cookies.get(`CognitoIdentityServiceProvider.${clientId}.idToken`)?.value
    }
    
    // Pattern 2: CognitoIdentityServiceProvider.undefined.idToken (fallback)
    if (!idToken) {
      idToken = cookies.get('CognitoIdentityServiceProvider.undefined.idToken')?.value
    }
    
    // Pattern 3: Check all cookies for idToken
    if (!idToken) {
      const allCookies = cookies.getAll()
      for (const cookie of allCookies) {
        if (cookie.name.includes('idToken') && cookie.value) {
          idToken = cookie.value
          break
        }
      }
    }
    
    // Pattern 4: Try Amplify's fetchAuthSession as last resort
    if (!idToken) {
      try {
        const session = await fetchAuthSession()
        if (session?.tokens?.idToken) {
          const tokenPayload = session.tokens.idToken.payload as any
          return {
            userId: tokenPayload.sub || tokenPayload['cognito:username'],
            email: tokenPayload.email || ''
          }
        }
      } catch (sessionError) {
        console.log('fetchAuthSession failed, trying cookies:', sessionError)
      }
    }
    
    if (!idToken) {
      console.error('No auth token found. Available cookies:', Array.from(cookies.getAll()).map(c => c.name))
      return null
    }

    // Decode JWT token to get user info
    try {
      const decoded = decodeJwt(idToken) as any
      return {
        userId: decoded.sub || decoded['cognito:username'],
        email: decoded.email || decoded['cognito:email'] || ''
      }
    } catch (decodeError) {
      console.error('Error decoding JWT token:', decodeError)
      return null
    }
  } catch (error) {
    console.error('Error extracting user from request:', error)
    return null
  }
}

/**
 * Get or create a Stripe customer for the current authenticated user
 * Uses Cognito user ID to ensure each user has their own Stripe customer
 */
export async function getOrCreateStripeCustomer(request: NextRequest): Promise<Stripe.Customer | null> {
  try {
    const stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    })

    // Get user info from request
    const userInfo = await getUserFromRequest(request)
    
    if (!userInfo) {
      console.error('Could not get user info from request')
      return null
    }

    const cognitoUserId = userInfo.userId
    const userEmail = userInfo.email || `user-${cognitoUserId}@predixa.com`
    
    console.log('Found user:', { cognitoUserId, userEmail })

    // Search for existing Stripe customer by Cognito user ID in metadata
    const existingCustomers = await stripe.customers.search({
      query: `metadata['cognito_user_id']:'${cognitoUserId}'`,
      limit: 1
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]
    }

    // If not found by metadata, try searching by email (for backward compatibility)
    const customersByEmail = await stripe.customers.list({
      email: userEmail,
      limit: 1
    })

    // Check if any of these customers don't have a cognito_user_id metadata
    // If they do, they belong to another user, so create a new one
    for (const customer of customersByEmail.data) {
      if (!customer.metadata?.cognito_user_id) {
        // This is an old customer without metadata, update it
        await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            cognito_user_id: cognitoUserId,
            platform: 'web'
          }
        })
        return customer
      }
      // If cognito_user_id exists and doesn't match, skip this customer
      if (customer.metadata.cognito_user_id !== cognitoUserId) {
        continue
      }
      return customer
    }

    // Create new Stripe customer with Cognito user ID in metadata
    const newCustomer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        cognito_user_id: cognitoUserId,
        platform: 'web'
      }
    })

    return newCustomer
  } catch (error) {
    console.error('Error getting or creating Stripe customer:', error)
    throw error
  }
}

