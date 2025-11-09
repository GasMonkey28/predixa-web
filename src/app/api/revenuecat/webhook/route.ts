import { NextRequest, NextResponse } from 'next/server'
import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider'

import { config } from '@/lib/server/config'

const cognitoClient = new CognitoIdentityProviderClient({
  region: config.aws.region,
  credentials:
    config.aws.accessKeyId && config.aws.secretAccessKey
      ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        }
      : undefined,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verify webhook signature (implement based on RevenueCat docs)
    // const signature = request.headers.get('x-revenuecat-signature')
    // if (!verifyWebhookSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const { event } = body
    const { app_user_id, product_id, type, environment } = event

    // Map RevenueCat events to subscription status
    let subscriptionStatus = 'inactive'
    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'TEST': // Handle test events
        subscriptionStatus = 'active'
        break
      case 'CANCELLATION':
      case 'EXPIRATION':
        subscriptionStatus = 'canceled'
        break
      case 'BILLING_ISSUE':
        subscriptionStatus = 'past_due'
        break
    }

    console.log('RevenueCat webhook received:', {
      eventType: type,
      app_user_id,
      product_id,
      environment,
      subscriptionStatus
    })

    // Handle test events differently
    if (type === 'TEST') {
      console.log('Test event received - webhook is working correctly')
      return NextResponse.json({ 
        success: true, 
        message: 'Test webhook received successfully',
        eventType: 'TEST'
      })
    }

    // For real events, try to find the Cognito user
    try {
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: app_user_id,
      })
      
      const cognitoUser = await cognitoClient.send(getUserCommand)
      
      console.log('Cognito user found:', {
        username: cognitoUser.Username,
        subscriptionStatus
      })

      // Here you would typically:
      // 1. Store subscription data in a database
      // 2. Update Cognito user attributes
      // 3. Sync with Stripe if needed
      // 4. Send notifications to user

      return NextResponse.json({ 
        success: true,
        message: 'Webhook processed successfully',
        cognitoUser: cognitoUser.Username
      })
    } catch (cognitoError) {
      // If user doesn't exist in Cognito, log it but don't fail
      console.log('User not found in Cognito (this is normal for test events):', {
        app_user_id,
        error: cognitoError instanceof Error ? cognitoError.message : 'Unknown error'
      })

      return NextResponse.json({ 
        success: true,
        message: 'Webhook received but user not found in Cognito',
        note: 'This is normal for test events or if user signed up via mobile only'
      })
    }
  } catch (error: any) {
    console.error('Error processing RevenueCat webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Function to verify RevenueCat webhook signature
function verifyWebhookSignature(payload: any, signature: string | null): boolean {
  // Implement signature verification based on RevenueCat documentation
  // This is a placeholder - you need to implement actual verification
  return true
}
