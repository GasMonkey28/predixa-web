import { NextResponse } from 'next/server'
import axios from 'axios'

const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'

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
    console.log(`Trying S3 URL: ${url}`)
    console.log(`BUCKET: ${BUCKET}`)
    console.log(`TODAY: ${today}`)
    
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
      
      // Transform the data to match our expected format
      const s3Data = response.data
      
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
        disclaimer: cleanText(s3Data.disclaimer || s3Data.DISCLAIMER || 'Data provided for informational purposes only.')
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
