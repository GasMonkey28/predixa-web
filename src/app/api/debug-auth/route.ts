import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      error: 'This diagnostic endpoint has been disabled for security reasons.',
    },
    { status: 410 }
  )
}
