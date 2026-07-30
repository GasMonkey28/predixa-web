import { NextResponse } from 'next/server'
import axios from 'axios'

import { config } from '@/lib/server/config'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import {
  isSupportedTicker,
  model2ChartKey,
  normalizeTicker,
  tickerBucket,
} from '@/lib/tickers'

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

    const { searchParams } = new URL(request.url)
    const ticker = normalizeTicker(searchParams.get('ticker'))
    if (!isSupportedTicker(ticker)) {
      return NextResponse.json(
        { error: `Unsupported ticker: ${ticker}` },
        { status: 400, headers: getRateLimitHeaders(clientIp) }
      )
    }

    const dataBucket = tickerBucket(ticker, BUCKET)
    const key = model2ChartKey(ticker)
    const url1 = `https://s3.amazonaws.com/${dataBucket}/${key}`
    const url2 = `https://${dataBucket}.s3.amazonaws.com/${key}`

    logger.debug({ url1, url2, bucket: dataBucket, ticker, key }, 'Fetching Model2 data from S3')

    let response
    let url
    let s3Error: unknown = null

    try {
      url = url1
      response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        timeout: 10000,
      })
    } catch (error1: unknown) {
      s3Error = error1
      const msg = error1 instanceof Error ? error1.message : String(error1)
      logger.debug({ url: url1, error: msg }, 'First S3 URL failed, trying alternative')

      try {
        url = url2
        response = await axios.get(url, {
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
          timeout: 10000,
        })
        s3Error = null
      } catch (error2: unknown) {
        s3Error = error2
      }
    }

    if (s3Error || !response) {
      const axiosErr = s3Error as {
        message?: string
        response?: { status?: number; statusText?: string; data?: unknown }
      }
      const message =
        s3Error instanceof Error
          ? s3Error.message
          : typeof s3Error === 'string'
            ? s3Error
            : axiosErr?.message || 'Unknown error'
      const statusCode = axiosErr?.response?.status
      const statusText = axiosErr?.response?.statusText
      const responseData = axiosErr?.response?.data

      logger.error(
        {
          bucket: dataBucket,
          ticker,
          key,
          url1,
          url2,
          error: message,
          statusCode,
          statusText,
          responseData:
            typeof responseData === 'string' ? responseData.substring(0, 200) : responseData,
        },
        'S3 Model2 data unavailable; returning fallback'
      )

      if (statusCode === 403) {
        logger.error(
          { bucket: dataBucket, path: key },
          '⚠️ S3 403 Forbidden: Bucket policy needs to allow public read access'
        )
      }

      const fallback = {
        ticker,
        metadata: {
          generated_at: new Date().toISOString(),
          date_range: { start: '', end: '' },
          total_days: 0,
        },
        today: {
          date: new Date().toISOString().split('T')[0],
          final_signal: 'no_trade',
          position_size: 0,
          y1_signal: 'no_trade',
          y2y3_signal: 'no_trade',
          pred_y1: 0,
          pred_y2_plus_y3: 0,
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
          Pragma: 'no-cache',
          Expires: '0',
          'Surrogate-Control': 'no-store',
          ...getRateLimitHeaders(clientIp),
        },
      })
    }

    const s3Data = response.data

    logger.debug(
      {
        ticker,
        hasMetadata: !!s3Data.metadata,
        hasToday: !!s3Data.today,
        hasTradingDays: !!s3Data.trading_days,
        tradingDaysCount: s3Data.trading_days?.length || 0,
      },
      'Received Model2 data from S3'
    )

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
          pred_y2_plus_y3: lastDay.pred_y2_plus_y3 || 0,
        }
        logger.debug({ todayFromLastDay: true, ticker }, 'Extracted today data from last trading day')
      }
    }

    const transformedData = {
      ticker,
      metadata: s3Data.metadata || {},
      today: todayData || {},
      settings: s3Data.settings || {},
      trading_days: s3Data.trading_days || [],
    }

    logger.debug(
      {
        ticker,
        tradingDaysCount: transformedData.trading_days.length,
        todaySignal: transformedData.today.final_signal,
        todayPositionSize: transformedData.today.position_size,
      },
      'Fetched Model2 data successfully'
    )

    return NextResponse.json(transformedData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error({ error, message: (error as Error)?.message }, 'Unhandled error in model2 API')
    const clientIp =
      (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    return NextResponse.json(
      { error: 'Failed to fetch Model2 data' },
      {
        status: 500,
        headers: getRateLimitHeaders(clientIp),
      }
    )
  }
}
