/**
 * In-memory cache for Predixa Briefings
 * 
 * Caches briefings by mode and article hash to avoid redundant OpenAI API calls.
 * Cache is shared across all users and regenerates only when articles change.
 */

import type { PredixaBriefing, BriefingMode } from './types'
import crypto from 'crypto'

interface CachedBriefing {
  briefing: PredixaBriefing
  articleHash: string
  timestamp: number
  mode: BriefingMode
}

// In-memory cache: Map<mode, CachedBriefing>
const cache = new Map<BriefingMode, CachedBriefing>()

// Cache TTL: 60 minutes (3600000 ms)
const CACHE_TTL_MS = 60 * 60 * 1000

/**
 * Generates a hash from article IDs and timestamps
 * This ensures we regenerate briefings only when articles actually change
 */
export function generateArticleHash(articles: Array<{ id: string; publishedUtc: string }>): string {
  // Use first 5 articles' IDs and latest timestamp for hash
  const hashInput = articles
    .slice(0, 5)
    .map((a) => `${a.id}:${a.publishedUtc}`)
    .join('|')
  
  return crypto.createHash('md5').update(hashInput).digest('hex')
}

/**
 * Gets cached briefing if available and still valid
 */
export function getCachedBriefing(
  mode: BriefingMode,
  currentArticleHash: string
): PredixaBriefing | null {
  const cached = cache.get(mode)
  
  if (!cached) {
    return null
  }

  // Check if cache is expired
  const age = Date.now() - cached.timestamp
  if (age > CACHE_TTL_MS) {
    cache.delete(mode)
    return null
  }

  // Check if articles have changed
  if (cached.articleHash !== currentArticleHash) {
    cache.delete(mode)
    return null
  }

  // Cache hit - return cached briefing
  return cached.briefing
}

/**
 * Stores briefing in cache
 */
export function setCachedBriefing(
  mode: BriefingMode,
  briefing: PredixaBriefing,
  articleHash: string
): void {
  cache.set(mode, {
    briefing,
    articleHash,
    timestamp: Date.now(),
    mode,
  })
}

/**
 * Clears all cached briefings (useful for testing or forced refresh)
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Gets cache statistics (for debugging)
 */
export function getCacheStats() {
  const stats: Record<BriefingMode, { age: number; hasCache: boolean }> = {
    pro: { age: 0, hasCache: false },
    simple: { age: 0, hasCache: false },
    wsb: { age: 0, hasCache: false },
  }

  for (const [mode, cached] of cache.entries()) {
    stats[mode] = {
      age: Date.now() - cached.timestamp,
      hasCache: true,
    }
  }

  return stats
}

