import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { config } from '@/lib/server/config'

const region = config.aws.region
const userPoolId = config.cognito.userPoolId
const clientId = config.cognito.clientId

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

