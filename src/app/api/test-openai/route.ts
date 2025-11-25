/**
 * Test endpoint to debug OpenAI API call
 * Visit /api/test-openai to see if OpenAI is working
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not set', hasKey: false },
      { status: 500 }
    )
  }

  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: 'Respond with a JSON object: {"test": "success", "message": "OpenAI is working"}',
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100,
    })

    const content = completion.choices[0]?.message?.content

    return NextResponse.json({
      success: true,
      hasKey: true,
      model: 'gpt-4o-mini',
      response: content,
      parsed: content ? JSON.parse(content) : null,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        hasKey: true,
        error: error?.message || 'Unknown error',
        status: error?.status,
        code: error?.code,
        type: error?.type,
        stack: error?.stack,
      },
      { status: 500 }
    )
  }
}

