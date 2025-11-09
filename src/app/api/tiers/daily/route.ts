import { NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BUCKET = config.marketData.bucket

// Clean up text fields to handle encoding issues
const cleanText = (text: string) => {
  if (!text) return text
  return text
    .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

export async function GET() {
  try {
    // Get today's date in YYYY-MM-DD format using ET timezone (market timezone)
    // This ensures consistent date calculation regardless of server timezone
    const etTimeZone = 'America/New_York'
    const now = new Date()
    const etDate = new Date(now.toLocaleString('en-US', { timeZone: etTimeZone }))
    const today = etDate.toLocaleDateString('en-CA') // Returns YYYY-MM-DD format
    
    // Calculate yesterday in ET timezone
    const yesterdayEt = new Date(etDate)
    yesterdayEt.setDate(yesterdayEt.getDate() - 1)
    const yesterdayStr = yesterdayEt.toLocaleDateString('en-CA')
    
    let url = `https://s3.amazonaws.com/${BUCKET}/summary_json/${today}.json`
    // Removed console.logs to avoid exposing bucket name
    
    try {
      let response
      let actualDate = today
      try {
        response = await axios.get(url, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        console.log(`Successfully fetched data for ${today}`)
      } catch (todayError) {
        console.log(`Today's data not available (${today}), trying yesterday: ${yesterdayStr}`)
        url = `https://${BUCKET}.s3.amazonaws.com/summary_json/${yesterdayStr}.json`
        actualDate = yesterdayStr
        response = await axios.get(url, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        console.log(`Successfully fetched data for ${yesterdayStr}`)
      }
      
      // Transform today's (or actual) data
      const s3Data = response.data

      // Compute previous day string based on actualDate (UTC-safe)
      const [ay, am, ad] = actualDate.split('-').map((n: string) => parseInt(n, 10))
      const baseUtc = new Date(Date.UTC(ay, (am || 1) - 1, ad || 1))
      baseUtc.setUTCDate(baseUtc.getUTCDate() - 1)
      const prevDateStr = baseUtc.toISOString().slice(0, 10)

      // Try to fetch previous day's tiers
      let prevLong: string | null = null
      let prevShort: string | null = null
      try {
        const prevUrl = `https://${BUCKET}.s3.amazonaws.com/summary_json/${prevDateStr}.json`
        const prevResp = await axios.get(prevUrl, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        const prevData = prevResp.data
        prevLong = prevData.long_signal || prevData.long_tier || prevData.longTier || 'N/A'
        prevShort = prevData.short_signal || prevData.short_tier || prevData.shortTier || 'N/A'
      } catch (prevErr) {
        // If previous day isn't available, leave as null
        console.log(`Previous day data not available for ${prevDateStr}`)
      }

      const transformedData = {
        date: actualDate, // Use the actual date of the data fetched
        long_tier: s3Data.long_signal || s3Data.long_tier || s3Data.longTier || 'N/A',
        short_tier: s3Data.short_signal || s3Data.short_tier || s3Data.shortTier || 'N/A',
        long_score: s3Data.long_score || s3Data.longScore || 0,
        short_score: s3Data.short_score || s3Data.shortScore || 0,
        summary: cleanText(s3Data.summary || s3Data.SUMMARY || 'No summary available'),
        suggestions: Array.isArray(s3Data.suggestions)
          ? s3Data.suggestions.map(cleanText)
          : Array.isArray(s3Data.SUGGESTIONS)
          ? s3Data.SUGGESTIONS.map(cleanText)
          : [],
        confidence: cleanText(s3Data.confidence || s3Data.CONFIDENCE || 'Unknown'),
        risk: cleanText(s3Data.risk || s3Data.RISK || 'Unknown'),
        outlook: cleanText(s3Data.outlook || s3Data.OUTLOOK || 'No outlook available'),
        disclaimer: cleanText(s3Data.disclaimer || s3Data.DISCLAIMER || 'Data provided for informational purposes only.'),
        compensation_explanation: cleanText(s3Data.compensation_explanation || s3Data.compensationExplanation || ''),
        prev_date: prevDateStr,
        prev_long_tier: prevLong ?? 'N/A',
        prev_short_tier: prevShort ?? 'N/A'
      }
      
      return NextResponse.json(transformedData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      })
    } catch (s3Error) {
      console.error(`S3 data not available for ${today} - THROWING ERROR TO SEE REAL ISSUE`)
      console.error('S3 Error details:', s3Error instanceof Error ? s3Error.message : String(s3Error))
      console.error('BUCKET:', BUCKET)
      
      // Throw the error instead of trying fallback to see the real issue
      throw s3Error
    }
  } catch (error) {
    console.error('Error fetching daily tiers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily tier data' },
      { status: 500 }
    )
  }
}
