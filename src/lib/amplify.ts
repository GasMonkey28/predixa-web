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
            process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'http://localhost:3000',
            'http://localhost:3001',
            'https://www.predixaweb.com'
          ],
          redirectSignOut: [
            process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'http://localhost:3000',
            'http://localhost:3001',
            'https://www.predixaweb.com'
          ],
          responseType: 'code' as const
        },
        username: true,
        email: true
      }
    }
  }
}

export const configureAmplify = () => {
  Amplify.configure(amplifyConfig)
}



