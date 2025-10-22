# Subscription Integration Guide

## Overview

This document explains how to integrate subscriptions across your web app (Vercel), Stripe, AWS Cognito, and RevenueCat for mobile apps to ensure users have the same subscription across all platforms.

## Architecture

### Current Setup
- **Web App**: Next.js on Vercel
- **Authentication**: AWS Cognito
- **Web Subscriptions**: Stripe
- **Mobile Subscriptions**: RevenueCat (to be implemented)

### Integration Strategy

1. **User Identification**: Use Cognito user ID as the primary identifier
2. **Cross-Platform Mapping**: Map Cognito users to both Stripe customers and RevenueCat app users
3. **Unified Subscription Service**: Check both platforms for active subscriptions
4. **Webhook Sync**: Use RevenueCat webhooks to sync mobile subscriptions

## Implementation Details

### 1. Stripe + AWS Cognito Integration

**What was implemented:**
- Modified `create-checkout-session` to authenticate users via Cognito
- Link Stripe customers to Cognito user IDs via metadata
- Updated subscription API to fetch user-specific subscriptions

**Key changes:**
```typescript
// Stripe customer creation with Cognito user ID
customer = await stripe.customers.create({
  email: cognitoUser.signInDetails?.loginId,
  metadata: {
    cognito_user_id: cognitoUser.userId,
    platform: 'web'
  }
})
```

### 2. RevenueCat Integration

**Webhook Handler:** `/api/revenuecat/webhook/route.ts`
- Receives RevenueCat subscription events
- Maps app_user_id to Cognito user ID
- Updates subscription status in your system

**User Identification Strategy:**
- Use consistent app_user_id format: `cognito_{userId}_{emailPrefix}`
- Store mappings in Cognito custom attributes or database

### 3. Unified Subscription Service

**Service:** `src/lib/subscription-service.ts`
- Checks both Stripe and RevenueCat for active subscriptions
- Returns the most recent active subscription
- Provides platform-agnostic subscription status

**Usage:**
```typescript
import { subscriptionService } from '@/lib/subscription-service'

// Check if user has any active subscription
const hasActive = await subscriptionService.hasActiveSubscription()

// Get unified subscription data
const subscription = await subscriptionService.getUnifiedSubscription()
```

## Environment Variables Required

Add these to your Vercel environment variables:

```bash
# AWS Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id
NEXT_PUBLIC_AWS_REGION=your_region

# AWS SDK (for server-side operations)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# RevenueCat (optional, for webhook verification)
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
```

## Mobile App Integration

### RevenueCat Setup

1. **Configure RevenueCat** with your Stripe account
2. **Set app_user_id** to match Cognito user ID format
3. **Configure webhook** to point to your Vercel app: `https://your-app.vercel.app/api/revenuecat/webhook`

### Mobile App Code Example

```swift
// iOS Swift
import RevenueCat

// Set the app user ID to match Cognito user ID
Purchases.shared.logIn("cognito_\(cognitoUserId)_\(emailPrefix)") { customerInfo, created, error in
    // Handle subscription status
}
```

```kotlin
// Android Kotlin
import com.revenuecat.purchases.Purchases

// Set the app user ID to match Cognito user ID
Purchases.sharedInstance.logIn("cognito_${cognitoUserId}_${emailPrefix}") { customerInfo, created ->
    // Handle subscription status
}
```

## Subscription Flow

### Web Subscription (Stripe)
1. User signs in via Cognito
2. User clicks subscribe → Stripe checkout
3. Stripe customer created with Cognito user ID in metadata
4. Subscription status stored in Stripe
5. Web app checks Stripe for subscription status

### Mobile Subscription (RevenueCat)
1. User signs in via Cognito (same account as web)
2. Mobile app sets app_user_id to match Cognito format
3. User purchases via RevenueCat
4. RevenueCat webhook notifies your web app
5. Web app updates subscription status

### Cross-Platform Access
1. User subscribes on web → Can access mobile app
2. User subscribes on mobile → Can access web app
3. Both platforms check unified subscription service
4. Active subscription on either platform grants access to both

## Testing

### Test Web Subscription
1. Sign in to web app
2. Go to account page
3. Click subscribe
4. Complete Stripe checkout
5. Verify subscription appears in account page

### Test Mobile Subscription
1. Sign in to mobile app with same Cognito account
2. Purchase subscription via RevenueCat
3. Check web app - should show active subscription
4. Check mobile app - should show active subscription

## Troubleshooting

### Common Issues

1. **Subscription not syncing**: Check webhook configuration and user ID mapping
2. **Authentication errors**: Verify Cognito configuration and AWS credentials
3. **Stripe errors**: Check API keys and customer creation logic
4. **RevenueCat errors**: Verify app_user_id format and webhook endpoint

### Debug Steps

1. Check browser console for errors
2. Check Vercel function logs
3. Verify environment variables
4. Test webhook with RevenueCat dashboard
5. Check Stripe dashboard for customer creation

## Next Steps

1. **Install dependencies**: Run `npm install` to install AWS SDK
2. **Set environment variables** in Vercel dashboard
3. **Test web subscription** flow
4. **Configure RevenueCat** webhook
5. **Test mobile subscription** flow
6. **Implement user ID mapping** storage solution
7. **Add error handling** and logging
8. **Set up monitoring** for subscription events

## Security Considerations

1. **Webhook verification**: Implement proper signature verification for RevenueCat webhooks
2. **API authentication**: Ensure all subscription APIs require Cognito authentication
3. **Data validation**: Validate all incoming webhook data
4. **Error handling**: Don't expose sensitive information in error messages
5. **Rate limiting**: Implement rate limiting for subscription APIs

## Monitoring

Set up monitoring for:
- Subscription creation/updates
- Webhook failures
- Authentication errors
- API response times
- Cross-platform sync issues
