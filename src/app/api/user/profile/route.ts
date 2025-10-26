import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
})
const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = 'UserProfiles'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, givenName, familyName } = body
    const now = new Date().toISOString()
    
    // Check if profile exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      })
    )
    
    if (!existing.Item) {
      // Create new profile
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
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
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

