import { NextResponse } from 'next/server'
import { generatePredixaBriefing } from '@/app/news/spy/briefingClient'
import { fetchSpyNews } from '@/app/news/spy/newsClient'
import {
  getCachedBriefing,
  setCachedBriefing,
  generateArticleHash,
} from '@/app/news/spy/briefingCache'
import type { BriefingMode } from '@/app/news/spy/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = (searchParams.get('mode') || 'pro') as BriefingMode
    const forceRefresh = searchParams.get('force') === 'true'

    // Validate mode
    if (!['pro', 'simple', 'wsb'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be pro, simple, or wsb' },
        { status: 400 }
      )
    }

    // Fetch news articles
    const articles = await fetchSpyNews()

    if (articles.length === 0) {
      return NextResponse.json(
        { error: 'No articles available' },
        { status: 404 }
      )
    }

    // Generate article hash to detect changes
    const articleHash = generateArticleHash(articles)

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedBriefing = getCachedBriefing(mode, articleHash)
      if (cachedBriefing) {
        return NextResponse.json(
          {
            briefing: cachedBriefing,
            mode,
            articlesCount: articles.length,
            cached: true,
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
              'X-Cache': 'HIT',
            },
          }
        )
      }
    }

    // Cache miss or force refresh - generate new briefing
    const briefing = await generatePredixaBriefing(articles, mode)

    // Store in cache
    setCachedBriefing(mode, briefing, articleHash)

    return NextResponse.json(
      {
        briefing,
        mode,
        articlesCount: articles.length,
        cached: false,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Cache': 'MISS',
        },
      }
    )
  } catch (error) {
    console.error('Error in briefing API:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate briefing',
      },
      { status: 500 }
    )
  }
}

