import { Amplify } from 'aws-amplify'

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      region: process.env.NEXT_PUBLIC_AWS_REGION!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://www.predixaweb.com',
            'https://predixa-web.vercel.app'
          ],
          redirectSignOut: [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://www.predixaweb.com',
            'https://predixa-web.vercel.app'
          ],
          responseType: 'code' as const
        },
        username: true,
        email: true
      }
    },
    // Identity Pool for DynamoDB access (OAuth users)
    ...(process.env.NEXT_PUBLIC_IDENTITY_POOL_ID && {
      CognitoIdentity: {
        PoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID,
        Region: process.env.NEXT_PUBLIC_AWS_REGION,
      },
    }),
  }
}

export const configureAmplify = () => {
  // Debug logging for local development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('🔍 Amplify Config Debug:', {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ? '✅ Set' : '❌ Missing',
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ? '✅ Set' : '❌ Missing',
      region: process.env.NEXT_PUBLIC_AWS_REGION ? '✅ Set' : '❌ Missing',
      domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ? '✅ Set' : '❌ Missing',
      userPoolIdValue: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.substring(0, 10) + '...',
      clientIdValue: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID?.substring(0, 10) + '...',
    })
  }
  Amplify.configure(amplifyConfig)
}



