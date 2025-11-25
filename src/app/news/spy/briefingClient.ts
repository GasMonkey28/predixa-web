/**
 * Client for generating AI-powered Predixa Briefing using OpenAI
 * 
 * Environment variable required:
 * - OPENAI_API_KEY: Your OpenAI API key
 * 
 * Set in .env.local for development or Vercel environment variables for production.
 */

import OpenAI from 'openai'
import type { MassiveNewsItem, PredixaBriefing, Sentiment } from './types'

/**
 * Generates a Predixa Briefing from news articles using OpenAI
 * @param articles Array of news articles to summarize
 * @returns AI-generated briefing with daily summary, themes, sentiment, and top articles
 */
export async function generatePredixaBriefing(
  articles: MassiveNewsItem[]
): Promise<PredixaBriefing> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set')
    return getFallbackBriefing('OpenAI API key is not configured')
  }

  // Take top 10-15 articles for the briefing
  const topArticles = articles.slice(0, 15)

  // Build compact prompt with article information
  const articlesText = topArticles
    .map((article, index) => {
      const date = new Date(article.publishedUtc).toLocaleString('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      return `${index + 1}. [${date} UTC] ${article.publisherName} – ${article.title}${article.description ? ` : ${article.description}` : ''}`
    })
    .join('\n')

  const prompt = `You are generating a daily SPY (S&P 500 ETF) market news briefing for Predixa, a trading analytics platform.

Here are today's top SPY news articles:

${articlesText}

Please generate a concise daily briefing that:
- Summarizes the key market-moving news in 3-6 short bullet points
- Identifies 2-6 main themes (one or two words each, e.g., "inflation", "labor market", "tariffs")
- Assesses overall market sentiment (bullish, bearish, mixed, or neutral) based on the articles
- Selects up to 5 most important articles

IMPORTANT:
- Be concise and factual
- Do NOT provide explicit trading advice
- Only use information from the articles provided
- Output only valid JSON matching the required schema

Return a JSON object with:
- daily_brief: array of 3-6 short bullet point strings
- themes: array of 2-6 one or two-word theme tags
- sentiment: one of "bullish", "bearish", "mixed", or "neutral"
- top_articles: array of up to 5 articles with title, publisher, published_utc, and url fields`

  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // Try with JSON mode first (simpler, more compatible)
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency
        messages: [
          {
            role: 'system',
            content:
              'You are a financial news analyst creating concise market briefings. Always output valid JSON matching this exact structure: {"daily_brief": ["bullet 1", "bullet 2"], "themes": ["theme1", "theme2"], "sentiment": "bullish|bearish|mixed|neutral", "top_articles": [{"title": "...", "publisher": "...", "published_utc": "...", "url": "..."}]}',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1500,
      })
    } catch (apiError: any) {
      console.error('OpenAI API error:', {
        message: apiError?.message,
        status: apiError?.status,
        code: apiError?.code,
        type: apiError?.type,
      })
      throw apiError
    }

    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new Error('OpenAI returned empty response')
    }

    // Parse the JSON response
    let parsed: PredixaBriefing
    try {
      parsed = JSON.parse(content) as PredixaBriefing
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', {
        content: content.substring(0, 200),
        error: parseError,
      })
      throw new Error('Invalid JSON response from OpenAI')
    }

    // Validate and fix structure
    if (!Array.isArray(parsed.daily_brief)) {
      parsed.daily_brief = []
    }
    if (!Array.isArray(parsed.themes)) {
      parsed.themes = []
    }
    if (!Array.isArray(parsed.top_articles)) {
      parsed.top_articles = []
    }

    // Ensure minimum items
    if (parsed.daily_brief.length < 3) {
      parsed.daily_brief = [
        ...parsed.daily_brief,
        ...Array(3 - parsed.daily_brief.length).fill('Market news update'),
      ]
    }
    if (parsed.themes.length < 2) {
      parsed.themes = [...parsed.themes, ...Array(2 - parsed.themes.length).fill('market')]
    }

    // Validate sentiment
    const validSentiments: Sentiment[] = ['bullish', 'bearish', 'mixed', 'neutral']
    if (!validSentiments.includes(parsed.sentiment)) {
      parsed.sentiment = 'neutral'
    }

    return parsed
  } catch (error) {
    console.error('Error generating Predixa Briefing:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return getFallbackBriefing(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Returns a fallback briefing when OpenAI fails
 */
function getFallbackBriefing(errorMessage: string): PredixaBriefing {
  return {
    daily_brief: [
      'Predixa Briefing is temporarily unavailable.',
      'Please check back shortly for AI-powered market insights.',
    ],
    themes: ['market news'],
    sentiment: 'neutral',
    top_articles: [],
  }
}

