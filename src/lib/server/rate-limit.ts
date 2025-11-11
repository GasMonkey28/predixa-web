const RATE_LIMIT = Number(process.env.RATE_LIMIT_REQUESTS_PER_WINDOW || 100)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)

const buckets = new Map<string, { count: number; expiresAt: number }>()

export function checkRateLimit(identifier: string): boolean {
  if (!RATE_LIMIT || RATE_LIMIT <= 0) {
    return true
  }

  const now = Date.now()
  const bucket = buckets.get(identifier)

  if (!bucket || bucket.expiresAt < now) {
    buckets.set(identifier, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  bucket.count += 1
  if (bucket.count > RATE_LIMIT) {
    return false
  }

  return true
}

export function getRateLimitHeaders(identifier: string) {
  const bucket = buckets.get(identifier)
  const now = Date.now()
  const reset = bucket ? Math.max(bucket.expiresAt - now, 0) : RATE_LIMIT_WINDOW_MS
  const remaining = bucket ? Math.max(RATE_LIMIT - bucket.count, 0) : RATE_LIMIT - 1

  return {
    'X-RateLimit-Limit': RATE_LIMIT.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(reset / 1000).toString(),
  }
}

