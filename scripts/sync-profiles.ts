/**
 * Migration script to sync existing Cognito users to DynamoDB
 * Run this once to backfill existing users
 * 
 * Usage:
 *   npx ts-node scripts/sync-profiles.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const dynamoClient = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const docClient = DynamoDBDocumentClient.from(dynamoClient)
const TABLE_NAME = process.env.USER_PROFILE_TABLE_NAME || 'UserProfiles'

interface CognitoUserAttribute {
  Name: string
  Value: string
}

async function syncProfiles() {
  console.log('Starting profile sync from Cognito to DynamoDB...')
  
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
  if (!userPoolId) {
    throw new Error('NEXT_PUBLIC_COGNITO_USER_POOL_ID not found in environment')
  }

  let paginationToken: string | undefined
  let syncedCount = 0
  let skippedCount = 0

  do {
    const response = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        PaginationToken: paginationToken,
        Limit: 60, // Max batch size
      })
    )

    for (const user of response.Users || []) {
      if (!user.Username) continue

      // Extract attributes
      const attributes: Record<string, string> = {}
      for (const attr of user.Attributes || []) {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value
        }
      }

      try {
        // Create profile in DynamoDB
        const now = new Date().toISOString()
        const profile = {
          userId: user.Username,
          email: attributes.email || '',
          givenName: attributes.given_name || '',
          familyName: attributes.family_name || '',
          displayName: `${attributes.given_name || ''} ${attributes.family_name || ''}`.trim(),
          createdAt: user.UserCreateDate?.toISOString() || now,
          updatedAt: user.UserLastModifiedDate?.toISOString() || now,
        }

        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: profile,
          })
        )

        console.log(`✓ Synced: ${attributes.email || user.Username}`)
        syncedCount++
      } catch (error) {
        console.error(`✗ Failed to sync ${attributes.email || user.Username}:`, error)
        skippedCount++
      }
    }

    paginationToken = response.PaginationToken
  } while (paginationToken)

  console.log('\n=== Sync Complete ===')
  console.log(`Synced: ${syncedCount} users`)
  console.log(`Skipped: ${skippedCount} users`)
}

// Run the sync
syncProfiles()
  .then(() => {
    console.log('\nMigration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })



