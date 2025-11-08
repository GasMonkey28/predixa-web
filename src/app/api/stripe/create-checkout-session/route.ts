import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getOrCreateStripeCustomer } from '@/lib/stripe-helpers'

const REGION = process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'us-east-1'
const ENTITLEMENTS_TABLE = process.env.ENTITLEMENTS_TABLE || 'predixa_entitlements'

const dynamoClient = new DynamoDBClient({
  region: REGION,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
})

const docClient = DynamoDBDocumentClient.from(dynamoClient)

async function getEntitlementRecord(cognitoSub: string) {
  if (!cognitoSub) return null
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: ENTITLEMENTS_TABLE,
        Key: { cognito_sub: cognitoSub },
      })
    )
    return result.Item || null
  } catch (error) {
    console.error('Failed to read entitlement record:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId, userEmail, promoCode } = await request.json()

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })

    // Get or create Stripe customer for the authenticated user
    let customer = await getOrCreateStripeCustomer(request)
    
    // Fallback: if cookie extraction fails, try using userId from request body
    if (!customer && userId) {
      console.log('Cookie extraction failed, using userId from request:', userId)
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
      return NextResponse.json({ 
        error: 'User authentication required. Please sign in and try again.',
        debug: 'No customer found and no userId provided'
      }, { status: 401 })
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
        return NextResponse.json({ 
          error: 'You already have an active subscription to this plan. Use "Manage Subscription" to modify it.',
          hasActiveSubscription: true
        }, { status: 400 })
      }
      
      // If different plan, allow upgrade/downgrade through customer portal
      // For now, we'll prevent duplicate subscriptions entirely
      return NextResponse.json({ 
        error: 'You already have an active subscription. Please cancel your current subscription first or use "Manage Subscription" to switch plans.',
        hasActiveSubscription: true
      }, { status: 400 })
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
            console.warn(`Promo code "${promoCode}" not found, proceeding without discount`)
            // If promo code not found, allow customers to enter codes on Stripe's checkout page
            sessionConfig.allow_promotion_codes = true
          }
        }
      } catch (promoError) {
        console.error('Error applying promo code:', promoError)
        // Continue without the promo code, allow customers to enter codes on Stripe's checkout page
        sessionConfig.allow_promotion_codes = true
      }
    } else {
      // No promo code provided, enable promo codes in checkout (customers can enter codes on Stripe's checkout page)
      sessionConfig.allow_promotion_codes = true
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({ sessionId: session.id })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



