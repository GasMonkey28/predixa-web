/**
 * Test endpoint to debug Massive.com API response structure
 * Visit /api/test-massive to see the raw API response
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.MASSIVE_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'MASSIVE_API_KEY not set' },
      { status: 500 }
    )
  }

  const url = `https://api.massive.com/v2/reference/news?ticker=SPY&limit=20&apiKey=${apiKey}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    const status = response.status
    const statusText = response.statusText
    const rawText = await response.text()

    let parsedData
    try {
      parsedData = JSON.parse(rawText)
    } catch {
      parsedData = { raw: rawText }
    }

    return NextResponse.json(
      {
        status,
        statusText,
        contentType: response.headers.get('content-type'),
        isArray: Array.isArray(parsedData),
        keys: typeof parsedData === 'object' ? Object.keys(parsedData) : null,
        dataType: typeof parsedData,
        dataPreview: Array.isArray(parsedData)
          ? {
              length: parsedData.length,
              firstItem: parsedData[0],
            }
          : parsedData,
        fullData: parsedData,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

