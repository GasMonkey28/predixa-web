import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const customProxyUrl = process.env.CUSTOM_PROXY_URL
  const scraperApiKey = process.env.SCRAPER_API_KEY
  
  return NextResponse.json({
    customProxyUrl: customProxyUrl || 'NOT SET',
    customProxyUrlLength: customProxyUrl?.length || 0,
    scraperApiKey: scraperApiKey ? 'SET (hidden)' : 'NOT SET',
    hasProtocol: customProxyUrl?.startsWith('http://') || customProxyUrl?.startsWith('https://'),
    wouldUseProxy: !!(customProxyUrl || scraperApiKey),
    constructedUrl: customProxyUrl 
      ? (customProxyUrl.startsWith('http://') || customProxyUrl.startsWith('https://') 
          ? customProxyUrl 
          : `https://${customProxyUrl}`)
      : 'N/A'
  })
}

