import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

const region =
  process.env.NEXT_PUBLIC_AWS_REGION ||
  process.env.AWS_REGION ||
  process.env.COGNITO_REGION
const userPoolId =
  process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ||
  process.env.COGNITO_USER_POOL_ID
const clientId =
  process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ||
  process.env.COGNITO_CLIENT_ID

const issuer =
  region && userPoolId
    ? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
    : undefined

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!issuer) {
    throw new Error('Cognito issuer is not configured')
  }
  if (!jwks) {
    const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`)
    jwks = createRemoteJWKSet(jwksUrl)
  }
  return jwks
}

export async function verifyCognitoToken(token: string): Promise<JWTPayload> {
  if (!token) {
    throw new Error('Missing token')
  }
  if (!issuer) {
    throw new Error('Cognito issuer is not configured')
  }

  const audience = clientId ? [clientId] : undefined

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer,
    ...(audience && { audience }),
  })

  return payload
}

