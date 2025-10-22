import { NextResponse } from 'next/server'
import axios from 'axios'

const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET!
const TICKER = process.env.NEXT_PUBLIC_TICKER || 'SPY'

export async function GET() {
  try {
    // Get today's date in YYYY-MM-DD format (using local timezone)
    const today = new Date().toLocaleDateString('en-CA') // Returns YYYY-MM-DD format
    
    // Try to fetch from S3 bucket with today's date
    const url = `https://${BUCKET}.s3.amazonaws.com/summary_json/${today}.json`
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      // Transform the data to match our expected format
      const s3Data = response.data
      
      // Clean up text fields to handle encoding issues
      const cleanText = (text: string) => {
        if (!text) return text
        return text
          .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
      }
      
      const transformedData = {
        date: today,
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
      
      return NextResponse.json(transformedData)
    } catch (s3Error) {
      console.log(`S3 data not available for ${today}, using mock data`)
      
      // Fallback to mock data if S3 is not available
      const mockData = {
        date: today,
        long_tier: 'B+',
        short_tier: 'C+',
        long_score: 75.2,
        short_score: 45.8,
        summary: 'Moderate bullish bias with weak short pressure. Consider buy-the-dip opportunities on pullbacks.',
        suggestions: [
          'Look for entry opportunities on any pullbacks to support levels',
          'Consider reducing position sizes if long tier drops below B',
          'Monitor for any significant economic calendar events'
        ],
        confidence: 'Medium',
        risk: 'Moderate',
        outlook: 'Bullish bias with cautious optimism',
        disclaimer: 'Tier rankings are probabilistic predictions, not guarantees. Always use proper risk management.'
      }
      
      return NextResponse.json(mockData)
    }
  } catch (error) {
    console.error('Error fetching daily tiers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily tier data' },
      { status: 500 }
    )
  }
}
