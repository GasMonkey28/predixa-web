import { NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'

// Force dynamic rendering - prevents Next.js from caching this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BUCKET = config.marketData.bucket

export async function GET(request: Request) {
  try {
    const clientIp =
      (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    if (!checkRateLimit(clientIp)) {
      logger.warn({ ip: clientIp }, 'Rate limit exceeded for model2 endpoint')
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(clientIp),
          },
        }
      )
    }

    // Fetch Model2 data from S3 - try both URL formats
    const url1 = `https://s3.amazonaws.com/${BUCKET}/model2_y2y3/chart/latest.json`
    const url2 = `https://${BUCKET}.s3.amazonaws.com/model2_y2y3/chart/latest.json`
    
    logger.debug({ url1, url2, bucket: BUCKET }, 'Fetching Model2 data from S3')
    
    let response
    let url
    let s3Error: any = null
    
    // Try first URL format
    try {
      url = url1
      response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 10000 // 10 second timeout
      })
    } catch (error1: any) {
      s3Error = error1
      logger.debug({ url: url1, error: error1.message }, 'First S3 URL failed, trying alternative')
      
      // Try alternative URL format
      try {
        url = url2
        response = await axios.get(url, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 10000
        })
        s3Error = null // Success, clear error
      } catch (error2: any) {
        s3Error = error2
        // Both URLs failed, will return fallback below
      }
    }
    
    // If fetch failed, return fallback
    if (s3Error || !response) {
      const message =
        s3Error instanceof Error ? s3Error.message : typeof s3Error === 'string' ? s3Error : 'Unknown error'
      const statusCode = s3Error?.response?.status
      const statusText = s3Error?.response?.statusText
      const responseData = s3Error?.response?.data
      
      logger.error({ 
        bucket: BUCKET, 
        url1,
        url2,
        error: message,
        statusCode,
        statusText,
        responseData: typeof responseData === 'string' ? responseData.substring(0, 200) : responseData
      }, 'S3 Model2 data unavailable; returning fallback')
      
      // If 403, it's a permissions issue
      if (statusCode === 403) {
        logger.error({ 
          bucket: BUCKET,
          path: 'model2_y2y3/chart/latest.json'
        }, '⚠️ S3 403 Forbidden: Bucket policy needs to allow public read access to model2_y2y3/*. See S3_POLICY_UPDATE_MODEL2.md')
      }

      const fallback = {
        metadata: {
          generated_at: new Date().toISOString(),
          date_range: { start: '', end: '' },
          total_days: 0
        },
        today: {
          date: new Date().toISOString().split('T')[0],
          final_signal: 'no_trade',
          position_size: 0,
          y1_signal: 'no_trade',
          y2y3_signal: 'no_trade',
          pred_y1: 0,
          pred_y2_plus_y3: 0
        },
        settings: {},
        trading_days: [],
        fallback: true,
        error: message,
      }

      return NextResponse.json(fallback, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          ...getRateLimitHeaders(clientIp),
        },
      })
    }
    
    // Process the successful response
    const s3Data = response.data
      
    logger.debug({ 
      hasMetadata: !!s3Data.metadata,
      hasToday: !!s3Data.today,
      hasTradingDays: !!s3Data.trading_days,
      tradingDaysCount: s3Data.trading_days?.length || 0
    }, 'Received Model2 data from S3')
      
    // If today is not in root, try to get it from the last trading day
    let todayData = s3Data.today
    if (!todayData && s3Data.trading_days && s3Data.trading_days.length > 0) {
      const lastDay = s3Data.trading_days[s3Data.trading_days.length - 1]
      if (lastDay.as_of_date) {
        todayData = {
          date: lastDay.as_of_date,
          final_signal: lastDay.final_signal || 'no_trade',
          position_size: lastDay.position_size || 0,
          y1_signal: lastDay.y1_signal || 'no_trade',
          y2y3_signal: lastDay.y2y3_signal || 'no_trade',
          pred_y1: lastDay.pred_y1 || 0,
          pred_y2_plus_y3: lastDay.pred_y2_plus_y3 || 0
        }
        logger.debug({ todayFromLastDay: true }, 'Extracted today data from last trading day')
      }
    }
      
    // Transform and return the data
    const transformedData = {
      metadata: s3Data.metadata || {},
      today: todayData || {},
      settings: s3Data.settings || {},
      trading_days: s3Data.trading_days || []
    }
      
    logger.debug({ 
      tradingDaysCount: transformedData.trading_days.length,
      todaySignal: transformedData.today.final_signal,
      todayPositionSize: transformedData.today.position_size
    }, 'Fetched Model2 data successfully')
      
    return NextResponse.json(transformedData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        ...getRateLimitHeaders(clientIp),
      }
    })
  } catch (error) {
    logger.error({ error, message: (error as Error)?.message }, 'Unhandled error in model2 API')
    const clientIp =
      (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    return NextResponse.json({ error: 'Failed to fetch Model2 data' }, {
      status: 500,
      headers: getRateLimitHeaders(clientIp),
    })
  }
}
