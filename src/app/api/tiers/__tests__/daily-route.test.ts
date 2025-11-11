import { NextResponse } from 'next/server'

jest.mock('axios', () => {
  const get = jest.fn()
  return {
    __esModule: true,
    default: { get },
  }
})

const mockedAxiosGet = (require('axios').default.get as jest.Mock)

describe('/api/tiers/daily', () => {
  beforeEach(() => {
    jest.resetModules()
    mockedAxiosGet.mockReset()
  })

  it('returns live data when S3 responds successfully', async () => {
    mockedAxiosGet
      .mockResolvedValueOnce({
        data: {
          long_signal: 'S',
          short_signal: 'B',
          summary: 'Strong upside momentum detected.',
          suggestions: ['Consider scaling into long exposure.'],
        },
      })
      .mockResolvedValueOnce({
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
    expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
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


