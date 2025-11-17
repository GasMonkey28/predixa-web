import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider'

import { config } from '@/lib/server/config'
import { logger } from '@/lib/server/logger'

// Initialize DynamoDB client
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
const ENTITLEMENTS_TABLE = config.entitlements.tableName

// Initialize Cognito client (for user lookup if needed)
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

    // RevenueCat webhook structure: { event: { ... } }
    const { event } = body
    
    if (!event) {
      logger.warn('RevenueCat webhook received without event object')
      return NextResponse.json({ error: 'Missing event object' }, { status: 400 })
    }

    const {
      app_user_id, // This should be the Cognito sub (based on iOS code)
      product_id,
      type, // INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc.
      environment, // SANDBOX or PRODUCTION
      expiration_at_ms,
      purchased_at_ms,
      period_type, // NORMAL, TRIAL, INTRO
      entitlements, // Object with entitlement info
    } = event

    // Map RevenueCat events to DynamoDB subscription status
    let subscriptionStatus = 'inactive'
    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        subscriptionStatus = 'active'
        break
      case 'CANCELLATION':
        subscriptionStatus = 'canceled'
        break
      case 'EXPIRATION':
        subscriptionStatus = 'canceled'
        break
      case 'BILLING_ISSUE':
        subscriptionStatus = 'past_due'
        break
      case 'TEST':
        // Test events - just acknowledge
        logger.info('RevenueCat test webhook received')
        return NextResponse.json({ 
          success: true, 
          message: 'Test webhook received successfully',
          eventType: 'TEST'
        })
      default:
        logger.warn({ type }, 'Unknown RevenueCat event type')
        subscriptionStatus = 'inactive'
    }

    // Calculate expiration timestamp (convert ms to seconds)
    const currentPeriodEnd = expiration_at_ms 
      ? Math.floor(expiration_at_ms / 1000)
      : null

    // Extract plan/product identifier
    // RevenueCat product_id might be like "monthly_pro" or "yearly_pro"
    // Map to your plan format if needed
    let planId = product_id || null

    // Check entitlements to see if user has active "pro" entitlement
    let hasActiveEntitlement = false
    if (entitlements && typeof entitlements === 'object') {
      const entitlementKeys = Object.keys(entitlements)
      hasActiveEntitlement = entitlementKeys.some(
        key => entitlements[key]?.is_active === true
      )
      
      // If we have active entitlements but status is inactive, fix it
      if (hasActiveEntitlement && subscriptionStatus === 'inactive' && type !== 'CANCELLATION' && type !== 'EXPIRATION') {
        subscriptionStatus = 'active'
      }
    }

    logger.info('RevenueCat webhook received', {
      eventType: type,
      app_user_id,
      product_id,
      environment,
      subscriptionStatus,
      hasActiveEntitlement,
      currentPeriodEnd
    })

    // app_user_id should be the Cognito sub (based on your iOS code)
    const cognitoSub = app_user_id

    if (!cognitoSub) {
      logger.error('No app_user_id in RevenueCat event')
      return NextResponse.json({ 
        error: 'Missing app_user_id' 
      }, { status: 400 })
    }

    // Update DynamoDB entitlements table
    try {
      const now = new Date().toISOString()
      
      // Check if record exists
      const existing = await docClient.send(
        new GetCommand({
          TableName: ENTITLEMENTS_TABLE,
          Key: { cognito_sub: cognitoSub },
        })
      )

      if (existing.Item) {
        // Update existing record
        const updateExpr: string[] = [
          '#status = :status',
          'updatedAt = :ua'
        ]
        const exprNames: Record<string, string> = { '#status': 'status' }
        const exprValues: Record<string, any> = {
          ':status': subscriptionStatus,
          ':ua': now
        }

        if (planId) {
          updateExpr.push('#plan = :plan')
          exprNames['#plan'] = 'plan'
          exprValues[':plan'] = planId
        }

        if (currentPeriodEnd !== null) {
          updateExpr.push('current_period_end = :cpe')
          exprValues[':cpe'] = currentPeriodEnd
        }

        // Add RevenueCat metadata
        if (product_id) {
          updateExpr.push('revenuecat_product_id = :rpid')
          exprValues[':rpid'] = product_id
        }

        updateExpr.push('platform = :platform')
        exprValues[':platform'] = 'revenuecat'

        if (environment) {
          updateExpr.push('revenuecat_environment = :env')
          exprValues[':env'] = environment
        }

        await docClient.send(
          new UpdateCommand({
            TableName: ENTITLEMENTS_TABLE,
            Key: { cognito_sub: cognitoSub },
            UpdateExpression: `SET ${updateExpr.join(', ')}`,
            ExpressionAttributeNames: exprNames,
            ExpressionAttributeValues: exprValues,
          })
        )

        logger.info({ cognitoSub, status: subscriptionStatus }, '✅ Updated DynamoDB entitlements')
      } else {
        // Create new record
        const item: Record<string, any> = {
          cognito_sub: cognitoSub,
          status: subscriptionStatus,
          platform: 'revenuecat',
          createdAt: now,
          updatedAt: now,
        }

        if (planId) {
          item.plan = planId
        }

        if (currentPeriodEnd !== null) {
          item.current_period_end = currentPeriodEnd
        }

        if (product_id) {
          item.revenuecat_product_id = product_id
        }

        if (environment) {
          item.revenuecat_environment = environment
        }

        await docClient.send(
          new PutCommand({
            TableName: ENTITLEMENTS_TABLE,
            Item: item,
          })
        )

        logger.info({ cognitoSub, status: subscriptionStatus }, '✅ Created DynamoDB entitlement record')
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Webhook processed and DynamoDB updated',
        cognito_sub: cognitoSub,
        status: subscriptionStatus,
        plan: planId
      })
    } catch (dbError: any) {
      logger.error({ error: dbError, cognitoSub }, '❌ Error updating DynamoDB')
      return NextResponse.json({ 
        error: 'Failed to update DynamoDB',
        details: dbError.message 
      }, { status: 500 })
    }
  } catch (error: any) {
    logger.error({ error }, 'Error processing RevenueCat webhook')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Function to verify RevenueCat webhook signature
function verifyWebhookSignature(payload: any, signature: string | null): boolean {
  // TODO: Implement signature verification based on RevenueCat documentation
  // This is a placeholder - you should implement actual verification
  // See: https://docs.revenuecat.com/docs/webhooks#webhook-signing
  return true
}
