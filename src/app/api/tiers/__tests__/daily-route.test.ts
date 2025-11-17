import { NextResponse } from 'next/server'

jest.mock('axios', () => {
  const get = jest.fn()
  return {
    __esModule: true,
    default: { get },
  }
})

const mockedAxiosGet = (require('axios').default.get as jest.Mock)
jest.mock('@/lib/server/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

jest.mock('@/lib/server/config', () => ({
  config: {
    marketData: {
      bucket: 'test-bucket',
    },
  },
}))

describe('/api/tiers/daily', () => {
  beforeEach(() => {
    mockedAxiosGet.mockReset()
  })

  it('returns live data when S3 responds successfully', async () => {
    // Mock today's data (first call)
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        long_signal: 'S',
        short_signal: 'B',
        summary: 'Strong upside momentum detected.',
        suggestions: ['Consider scaling into long exposure.'],
      },
    })
    
    // Mock previous day's data (second call) - route tries to fetch this but handles failure gracefully
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        long_signal: 'A',
        short_signal: 'C',
      },
    })

    const { GET } = await import('../daily/route')
    const response = (await GET(new Request('https://example.com/api/tiers/daily'))) as NextResponse
    const payload = (await response.json()) as any

    expect(response.status).toBe(200)
    expect(payload.long_tier).toBe('S')
    expect(payload.short_tier).toBe('B')
    expect(payload.summary).toContain('Strong upside momentum')
    expect(payload.fallback).toBeUndefined()
  })

  it('returns graceful fallback when S3 fetch fails', async () => {
    mockedAxiosGet.mockRejectedValue(new Error('Missing summary_json file'))

    const { GET } = await import('../daily/route')
    const response = (await GET(new Request('https://example.com/api/tiers/daily'))) as NextResponse
    const payload = (await response.json()) as any

    expect(response.status).toBe(200)
    expect(payload.fallback).toBe(true)
    expect(payload.long_tier).toBe('N/A')
    expect(payload.short_tier).toBe('N/A')
    expect(payload.summary).toContain('temporarily unavailable')
    expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
  })
})


