/**
 * Client for reading Predixa Briefings from S3
 * 
 * Uses direct S3 URLs (public access) or AWS SDK (for private buckets)
 */

import axios from 'axios'
import type { BriefingMode, PredixaBriefing } from '@/app/news/spy/types'

const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET

if (!BUCKET) {
  console.warn('⚠️ NEXT_PUBLIC_S3_BUCKET is not set! S3 briefing access will fail.')
}

export interface BriefingMetadata {
  briefing: PredixaBriefing
  mode: BriefingMode
  articlesCount: number
  articleHash: string
  generatedAt: string
  date: string
}

/**
 * Reads briefing from S3
 * @param mode Briefing mode (pro, simple, wsb)
 * @param useLatest If true, reads latest version; if false, reads today's dated version
 * @returns Briefing metadata or null if not found
 */
export async function readBriefingFromS3(
  mode: BriefingMode = 'pro',
  useLatest: boolean = true
): Promise<BriefingMetadata | null> {
  if (!BUCKET) {
    console.error('S3 bucket not configured')
    return null
  }

  try {
    // Construct S3 URL
    const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const key = useLatest
      ? `briefings/spy/latest-${mode}.json`
      : `briefings/spy/${dateStr}/${mode}.json`
    
    const url = `https://s3.amazonaws.com/${BUCKET}/${key}`
    
    const response = await axios.get<BriefingMetadata>(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      timeout: 10000, // 10 second timeout
    })
    
    if (response.data && response.data.briefing) {
      return response.data
    }
    
    return null
  } catch (error: any) {
    // 404 is expected if briefing doesn't exist yet
    if (error.response?.status === 404) {
      console.log(`Briefing not found in S3: ${mode} (${useLatest ? 'latest' : 'dated'})`)
      return null
    }
    
    console.error(`Error reading briefing from S3: ${error.message}`)
    return null
  }
}

/**
 * Checks if briefing is fresh (less than maxAgeMs old)
 * @param metadata Briefing metadata
 * @param maxAgeMs Maximum age in milliseconds (default: 4 hours)
 * @returns true if briefing is fresh
 */
export function isBriefingFresh(
  metadata: BriefingMetadata | null,
  maxAgeMs: number = 4 * 60 * 60 * 1000 // 4 hours
): boolean {
  if (!metadata || !metadata.generatedAt) {
    return false
  }
  
  try {
    const generatedAt = new Date(metadata.generatedAt)
    const age = Date.now() - generatedAt.getTime()
    return age < maxAgeMs
  } catch {
    return false
  }
}

/**
 * Gets briefing from S3 with freshness check
 * Falls back to dated version if latest is stale
 * @param mode Briefing mode
 * @param maxAgeMs Maximum age in milliseconds
 * @returns Briefing metadata or null
 */
export async function getFreshBriefingFromS3(
  mode: BriefingMode = 'pro',
  maxAgeMs: number = 4 * 60 * 60 * 1000 // 4 hours
): Promise<BriefingMetadata | null> {
  // Try latest first
  const latest = await readBriefingFromS3(mode, true)
  
  if (latest && isBriefingFresh(latest, maxAgeMs)) {
    return latest
  }
  
  // If latest is stale or missing, try dated version
  const dated = await readBriefingFromS3(mode, false)
  
  if (dated && isBriefingFresh(dated, maxAgeMs)) {
    return dated
  }
  
  // Return latest even if stale (better than nothing)
  return latest || dated
}

