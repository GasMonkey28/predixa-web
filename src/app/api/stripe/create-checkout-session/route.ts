import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getOrCreateStripeCustomer } from '@/lib/stripe-helpers'
import { config } from '@/lib/server/config'
import { logger } from '@/lib/server/logger'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'

const dynamoClient = new DynamoDBClient({
  region: config.aws.region,
  credentials:
    config.aws.accessKeyId && config.aws.secretAccessKey
      ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        }
      : undefined,
})

const docClient = DynamoDBDocumentClient.from(dynamoClient)

async function getEntitlementRecord(cognitoSub: string) {
  if (!cognitoSub) return null
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: config.entitlements.tableName,
        Key: { cognito_sub: cognitoSub },
      })
    )
    return result.Item || null
  } catch (error) {
    logger.error({ error, cognitoSub }, 'Failed to read entitlement record')
    return null
  }
}

export async function POST(request: NextRequest) {
  const clientIp =
    (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'anonymous'

  if (!checkRateLimit(clientIp)) {
    logger.warn({ ip: clientIp }, 'Stripe checkout rate limit exceeded')
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(clientIp) }
    )
  }

  let payload: { priceId?: string; userId?: string; userEmail?: string; promoCode?: string } = {}
  try {
    payload = await request.json()
    const { priceId, userId, userEmail, promoCode } = payload

    const stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    })

    // Get or create Stripe customer for the authenticated user
    let customer = await getOrCreateStripeCustomer(request)
    
    // Fallback: if cookie extraction fails, try using userId from request body
    if (!customer && userId) {
      logger.warn({ userId }, 'Cookie extraction failed; falling back to userId for Stripe customer lookup')
      // Search for existing customer by Cognito user ID
      const existingCustomers = await stripe.customers.search({
        query: `metadata['cognito_user_id']:'${userId}'`,
        limit: 1
      })
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
      } else {
        // Create new customer with provided info
        customer = await stripe.customers.create({
          email: userEmail || `user-${userId}@predixa.com`,
          metadata: {
            cognito_user_id: userId,
            platform: 'web'
          }
        })
      }
    }
    
    if (!customer) {
      logger.warn({ userId, priceId }, 'Stripe checkout requested without authenticated customer')
      return NextResponse.json(
        {
          error: 'User authentication required. Please sign in and try again.',
          debug: 'No customer found and no userId provided',
        },
        { status: 401, headers: getRateLimitHeaders(clientIp) }
      )
    }

    // Check if customer already has an active subscription
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    })

    if (existingSubscriptions.data.length > 0) {
      const activeSubscription = existingSubscriptions.data[0]
      const currentPriceId = activeSubscription.items.data[0]?.price.id
      
      // If trying to subscribe to the same plan, return error
      if (currentPriceId === priceId) {
        logger.info({ customerId: customer.id, priceId }, 'User attempted to subscribe to existing plan')
        return NextResponse.json(
          {
            error: 'You already have an active subscription to this plan. Use "Manage Subscription" to modify it.',
            hasActiveSubscription: true,
          },
          { status: 400, headers: getRateLimitHeaders(clientIp) }
        )
      }
      
      // If different plan, allow upgrade/downgrade through customer portal
      // For now, we'll prevent duplicate subscriptions entirely
      logger.info({ customerId: customer.id, priceId, currentPriceId }, 'User already has active subscription; blocking duplicate checkout')
      return NextResponse.json(
        {
          error: 'You already have an active subscription. Please cancel your current subscription first or use "Manage Subscription" to switch plans.',
          hasActiveSubscription: true,
        },
        { status: 400, headers: getRateLimitHeaders(clientIp) }
      )
    }

    const cognitoUserId =
      customer.metadata?.cognito_user_id ||
      customer.metadata?.cognito_sub ||
      userId

    let trialEndTimestamp: number | undefined

    const entitlement =
      cognitoUserId ? await getEntitlementRecord(cognitoUserId) : null

    if (
      entitlement &&
      typeof entitlement.trial_expires_at === 'number' &&
      entitlement.trial_expires_at > Math.floor(Date.now() / 1000)
    ) {
      trialEndTimestamp = entitlement.trial_expires_at
    } else if (
      customer.metadata?.trial_expires_at &&
      Number(customer.metadata.trial_expires_at) >
        Math.floor(Date.now() / 1000)
    ) {
      trialEndTimestamp = Number(customer.metadata.trial_expires_at)
    }

    // Build session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      customer: customer.id,
      payment_method_types: ['card', 'link'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/account?success=true`,
      cancel_url: `${request.nextUrl.origin}/account?canceled=true`,
    }

    if (trialEndTimestamp) {
      sessionConfig.subscription_data = {
        trial_end: trialEndTimestamp,
        metadata: {
          trial_converted_via: 'checkout_session',
        },
      }
    }

    // If a specific promo code is provided, apply it directly using discounts
    // NOTE: Cannot use both allow_promotion_codes and discounts at the same time
    if (promoCode) {
      try {
        // Verify the promo code exists and is valid
        const promoCodeObj = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        })

        if (promoCodeObj.data.length > 0) {
          sessionConfig.discounts = [
            {
              promotion_code: promoCodeObj.data[0].id,
            },
          ]
        } else {
          // If promo code not found, try to find by coupon code
          const coupons = await stripe.coupons.list({ limit: 100 })
          const matchingCoupon = coupons.data.find(
            (c) => c.id.toLowerCase() === promoCode.toLowerCase() || c.name?.toLowerCase() === promoCode.toLowerCase()
          )
          if (matchingCoupon) {
            sessionConfig.discounts = [{ coupon: matchingCoupon.id }]
          } else {
            logger.warn({ promoCode }, 'Promo code not found; allowing customer-entered promo codes')
            // If promo code not found, allow customers to enter codes on Stripe's checkout page
            sessionConfig.allow_promotion_codes = true
          }
        }
      } catch (promoError) {
        logger.error({ promoCode, error: promoError }, 'Error applying promo code')
        // Continue without the promo code, allow customers to enter codes on Stripe's checkout page
        sessionConfig.allow_promotion_codes = true
      }
    } else {
      // No promo code provided, enable promo codes in checkout (customers can enter codes on Stripe's checkout page)
      sessionConfig.allow_promotion_codes = true
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)
    logger.info(
      {
        customerId: customer.id,
        sessionId: session.id,
        priceId,
        promoCode: promoCode || undefined,
        hasTrial: Boolean(trialEndTimestamp),
      },
      'Stripe checkout session created'
    )

    return NextResponse.json({ sessionId: session.id }, { headers: getRateLimitHeaders(clientIp) })
  } catch (error: any) {
    logger.error({ error, priceId: payload.priceId, userId: payload.userId }, 'Error creating checkout session')
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}



