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
            'https://www.predixaweb.com',
            'https://predixa-web.vercel.app'
          ],
          redirectSignOut: [
            'http://localhost:3000',
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
  Amplify.configure(amplifyConfig)
}



