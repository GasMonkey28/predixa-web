/**
 * Client for generating AI-powered Predixa Briefing using OpenAI
 * 
 * Environment variable required:
 * - OPENAI_API_KEY: Your OpenAI API key
 * 
 * Set in .env.local for development or Vercel environment variables for production.
 */

import OpenAI from 'openai'
import type {
  MassiveNewsItem,
  PredixaBriefing,
  Sentiment,
  BriefingMode,
} from './types'

/**
 * Generates a Predixa Briefing from news articles using OpenAI
 * @param articles Array of news articles to summarize
 * @param mode Briefing mode: 'pro' (default), 'simple' (ELI5), or 'wsb' (meme style)
 * @returns AI-generated briefing with daily summary, themes, sentiment, and top articles
 */
export async function generatePredixaBriefing(
  articles: MassiveNewsItem[],
  mode: BriefingMode = 'pro'
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

  // Mode-specific prompt instructions
  const getModeInstructions = (mode: BriefingMode): string => {
    switch (mode) {
      case 'simple':
        return `You are generating a daily SPY (S&P 500 ETF) market news briefing for Predixa, written in VERY SIMPLE language - explain like the reader is 5 years old.

STYLE REQUIREMENTS:
- Use simple, everyday words (avoid financial jargon like "ETF", "volatility", "liquidity")
- Explain complex concepts in plain language
- Keep sentences short and easy to understand
- Use analogies when helpful (e.g., "like a piggy bank for many companies")
- Be friendly and approachable

Here are today's top SPY news articles:

${articlesText}

Please generate a simple daily briefing that:
- Summarizes the key market-moving news in 3-6 short, simple bullet points (use plain language)
- Identifies 2-6 main themes using simple words (e.g., "prices going up", "jobs", "taxes")
- Assesses overall market sentiment (bullish, bearish, mixed, or neutral) based on the articles
- Selects up to 5 most important articles

IMPORTANT:
- Use VERY SIMPLE language that anyone can understand
- Avoid financial jargon - explain everything in plain terms
- Do NOT provide explicit trading advice
- Only use information from the articles provided
- Output only valid JSON matching the required schema`

      case 'wsb':
        return `You are generating a daily SPY (S&P 500 ETF) market news briefing for Predixa in a fun, engaging WallStreetBets-inspired style.

STYLE REQUIREMENTS:
- Use fun, energetic language with meme references and emojis (sparingly)
- Make it entertaining and engaging
- Use terms like "stocks go brrr", "diamond hands", "tendies", "stonks" (playfully)
- Add excitement and personality
- NO profanity or inappropriate language
- NO explicit financial advice
- Keep it fun but informative

Here are today's top SPY news articles:

${articlesText}

Please generate a fun daily briefing that:
- Summarizes the key market-moving news in 3-6 short, energetic bullet points (with personality and occasional emojis)
- Identifies 2-6 main themes using fun tags (e.g., "inflation 📈", "jobs 💼", "tariffs 🚫")
- Assesses overall market sentiment (bullish, bearish, mixed, or neutral) based on the articles
- Selects up to 5 most important articles

IMPORTANT:
- Make it fun and engaging with meme culture references
- Use emojis sparingly (1-2 per bullet max)
- NO profanity or inappropriate content
- NO explicit trading advice
- Only use information from the articles provided
- Output only valid JSON matching the required schema`

      case 'pro':
      default:
        return `You are generating a daily SPY (S&P 500 ETF) market news briefing for Predixa, a trading analytics platform.

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
    }
  }

  const prompt = getModeInstructions(mode)

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
              mode === 'simple'
                ? 'You are a friendly financial educator who explains market news in very simple terms that anyone can understand. Always output valid JSON matching this exact structure: {"daily_brief": ["bullet 1", "bullet 2"], "themes": ["theme1", "theme2"], "sentiment": "bullish|bearish|mixed|neutral", "top_articles": [{"title": "...", "publisher": "...", "published_utc": "...", "url": "..."}]}'
                : mode === 'wsb'
                  ? 'You are a fun, energetic market commentator who makes financial news entertaining with meme culture references and personality. NO profanity. Always output valid JSON matching this exact structure: {"daily_brief": ["bullet 1", "bullet 2"], "themes": ["theme1", "theme2"], "sentiment": "bullish|bearish|mixed|neutral", "top_articles": [{"title": "...", "publisher": "...", "published_utc": "...", "url": "..."}]}'
                  : 'You are a financial news analyst creating concise market briefings. Always output valid JSON matching this exact structure: {"daily_brief": ["bullet 1", "bullet 2"], "themes": ["theme1", "theme2"], "sentiment": "bullish|bearish|mixed|neutral", "top_articles": [{"title": "...", "publisher": "...", "published_utc": "...", "url": "..."}]}',
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

