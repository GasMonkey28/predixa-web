/**
 * Client for fetching SPY news from Massive.com API
 * 
 * Environment variable required:
 * - MASSIVE_API_KEY: Your Massive.com API key
 * 
 * Set in .env.local for development or Vercel environment variables for production.
 */

import type { MassiveNewsItem, MassiveApiResponse } from './types'

/**
 * Fetches SPY news articles from Massive.com API
 * @returns Array of normalized news items
 * @throws Error if API key is missing or API call fails
 */
export async function fetchSpyNews(): Promise<MassiveNewsItem[]> {
  const apiKey = process.env.MASSIVE_API_KEY

  if (!apiKey) {
    throw new Error(
      'MASSIVE_API_KEY environment variable is required. Please set it in .env.local (development) or Vercel environment variables (production).'
    )
  }

  const url = `https://api.massive.com/v2/reference/news?ticker=SPY&limit=20&apiKey=${apiKey}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Next.js will cache this by default, but we want fresh data
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Massive.com API returned ${response.status}: ${response.statusText}. Response: ${errorText}`
      )
    }

    const rawData = await response.json()

    // Handle different response structures
    let articles: any[] = []

    // Check if response is directly an array
    if (Array.isArray(rawData)) {
      articles = rawData
    }
    // Check if response has a results/data/items property
    else if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.results)) {
        articles = rawData.results
      } else if (Array.isArray(rawData.data)) {
        articles = rawData.data
      } else if (Array.isArray(rawData.items)) {
        articles = rawData.items
      } else if (Array.isArray(rawData.news)) {
        articles = rawData.news
      } else {
        // Log the structure for debugging
        console.error('Unexpected API response structure:', {
          keys: Object.keys(rawData),
          type: typeof rawData,
          isArray: Array.isArray(rawData),
        })
        throw new Error(
          `Unexpected API response format. Expected array or object with results/data/items property. Got: ${JSON.stringify(rawData).substring(0, 200)}`
        )
      }
    } else {
      throw new Error(
        `Invalid API response: expected array or object, got ${typeof rawData}`
      )
    }

    // Validate we have articles
    if (!Array.isArray(articles) || articles.length === 0) {
      console.warn('API returned empty or invalid articles array')
      return []
    }

    // Normalize the response to our type
    return articles.map((item, index) => ({
      id: `massive-${index}-${item.published_utc || Date.now()}`,
      publisherName: item.publisher?.name || item.publisher || 'Unknown',
      title: item.title || '',
      description: item.description || '',
      publishedUtc: item.published_utc || item.published_at || '',
      url: item.article_url || item.url || item.link || '',
      tickers: item.tickers || item.symbols || [],
      keywords: item.keywords || [],
      sentiment: item.insights?.[0]?.sentiment || item.sentiment,
    }))
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch SPY news: ${error.message}`)
    }
    throw new Error('Failed to fetch SPY news: Unknown error')
  }
}

