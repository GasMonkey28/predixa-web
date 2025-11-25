/**
 * Type definitions for SPY News & Briefing feature
 */

export type Sentiment = 'bullish' | 'bearish' | 'mixed' | 'neutral'

export type BriefingMode = 'pro' | 'simple' | 'wsb'

/**
 * News item from Massive.com API
 */
export type MassiveNewsItem = {
  id: string
  publisherName: string
  title: string
  description: string
  publishedUtc: string
  url: string
  tickers: string[]
  keywords: string[]
  sentiment?: string
}

/**
 * AI-generated Predixa Briefing structure
 */
export type PredixaBriefing = {
  daily_brief: string[]
  themes: string[]
  sentiment: Sentiment
  top_articles: {
    title: string
    publisher: string
    published_utc: string
    url: string
  }[]
}

/**
 * Raw response structure from Massive.com API
 * The API returns an object with a 'results' array
 */
export type MassiveApiResponse = {
  results: Array<{
    id?: string
    publisher?: { name: string; homepage_url?: string; logo_url?: string; favicon_url?: string }
    title: string
    author?: string
    published_utc: string
    article_url: string
    tickers?: string[]
    description?: string
    keywords?: string[]
    image_url?: string
    insights?: Array<{
      ticker: string
      sentiment?: string
      sentiment_reasoning?: string
    }>
  }>
  status?: string
  request_id?: string
  count?: number
  next_url?: string
}

