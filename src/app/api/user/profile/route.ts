import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

import { config } from '@/lib/server/config'

// Create DynamoDB client with credentials
// For local dev: uses AWS CLI credentials
// For production: uses IAM role (Lambda/Vercel)
const client = new DynamoDBClient({
  region: config.aws.region,
  credentials:
    config.aws.accessKeyId && config.aws.secretAccessKey
      ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        }
      : undefined, // Will use default credential provider chain
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = 'UserProfiles'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, givenName, familyName } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    
    const now = new Date().toISOString()
    
    console.log('API: Updating profile for userId:', userId)
    
    // Check if profile exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      })
    )
    
    if (!existing.Item) {
      // Create new profile
      console.log('API: Creating new profile')
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            userId,
            email: email || '',
            givenName,
            familyName,
            displayName: `${givenName} ${familyName}`.trim(),
            createdAt: now,
            updatedAt: now,
          },
        })
      )
    } else {
      // Update existing profile
      console.log('API: Updating existing profile')
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { userId },
          UpdateExpression: 'SET givenName = :gn, familyName = :fn, displayName = :dn, updatedAt = :ua',
          ExpressionAttributeValues: {
            ':gn': givenName,
            ':fn': familyName,
            ':dn': `${givenName} ${familyName}`.trim(),
            ':ua': now,
          },
        })
      )
    }
    
    console.log('API: Profile updated successfully')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      region: config.aws.region,
    })
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      })
    )
    
    return NextResponse.json(result.Item || null)
  } catch (error: any) {
    console.error('Error getting profile:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

