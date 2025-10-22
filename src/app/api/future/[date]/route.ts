import { NextResponse } from 'next/server'
import { fetchFuture } from '@/lib/api'

export async function GET(
  request: Request,
  { params }: { params: { date: string } }
) {
  try {
    const data = await fetchFuture(params.date)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching future data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch future data' },
      { status: 500 }
    )
  }
}
