import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'This diagnostic endpoint has been disabled for security reasons.',
    },
    { status: 410 }
  )
}

