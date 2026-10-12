import axios from 'axios'
import { buildMarketInsight } from '../market-insight'

jest.mock('axios')
const get = axios.get as jest.MockedFunction<typeof axios.get>

describe('Market Insight weekly object calendar keys', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // No network requests: isolate the actual caller's key selection.
    get.mockImplementation(async url => {
      if (String(url).includes('/weekly/')) return { data: {} }
      throw new Error('Fixture has no other market objects')
    })
  })
  afterEach(() => jest.useRealTimers())

  it.each([
    ['2026-04-03T16:00:00Z', '2026-04-03'], // Good Friday still uses Friday's object key
    ['2027-03-26T16:00:00Z', '2027-03-26'],
    ['2026-10-12T16:00:00Z', '2026-10-16'], // Normal current week
    ['2026-11-01T16:00:00Z', '2026-10-30'], // DST weekend retains prior session's week
    ['2027-12-31T16:00:00Z', '2027-12-31'], // Saturday New Year's Day is not observed
  ])('loads the calendar-Friday key at %s', async (instant, expected) => {
    jest.setSystemTime(new Date(instant))
    await buildMarketInsight('calendar-test-bucket', 'SPY')
    const weeklyCalls = get.mock.calls.filter(([url]) => String(url).includes('/weekly/'))
    expect(weeklyCalls.map(([url]) => String(url))).toEqual([
      `https://calendar-test-bucket.s3.amazonaws.com/weekly/${expected}/SPY.json`,
    ])
  })
})
