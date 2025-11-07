import { NextRequest, NextResponse } from 'next/server'
import { CognitoIdentityProviderClient, AdminGetUserCommand, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
    }

    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json({ 
        error: 'AWS credentials not configured',
        message: 'This endpoint requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables'
      }, { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID) {
      return NextResponse.json({ 
        error: 'Cognito User Pool ID not configured'
      }, { status: 500 })
    }

    const client = new CognitoIdentityProviderClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    })

    try {
      // Try to get the user directly
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
        Username: email
      })

      const userResponse = await client.send(getUserCommand)
      
      return NextResponse.json({
        success: true,
        user: {
          username: userResponse.Username,
          status: userResponse.UserStatus,
          enabled: userResponse.Enabled,
          userCreateDate: userResponse.UserCreateDate,
          userLastModifiedDate: userResponse.UserLastModifiedDate,
          attributes: userResponse.UserAttributes?.reduce((acc: any, attr: any) => {
            acc[attr.Name] = attr.Value
            return acc
          }, {}),
          mfaOptions: userResponse.MFAOptions,
        },
        message: `User found with status: ${userResponse.UserStatus}`
      })
    } catch (error: any) {
      // If user not found, try searching
      if (error.name === 'UserNotFoundException') {
        return NextResponse.json({
          success: false,
          error: 'User not found',
          message: `No user found with email: ${email}`,
          suggestion: 'The user may not have been created, or the email might be different'
        })
      }
      
      throw error
    }
  } catch (error: any) {
    console.error('Error checking user:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      name: error.name,
      code: error.code
    }, { status: 500 })
  }
}

