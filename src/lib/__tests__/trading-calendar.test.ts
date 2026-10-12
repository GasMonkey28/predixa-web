import {
  classifyWeeklyPredictionRole, findLastCalendarFriday, findLastFridayOrMonday,
  formatDateYYYYMMDD, getMarketAnchorDate, getPreviousTradingDay,
  getWeekDateRange, getWeeklyPublishCandidateDates, isFridayAfterWeeklyPredictionCutoff,
  isTradingDay, parseDateYYYYMMDD,
} from '../trading-calendar'
import { execFileSync } from 'child_process'
import path from 'path'
import reference from './fixtures/nyse-closures.json'

const day = (date: string) => new Date(`${date}T16:00:00Z`)

describe('NYSE sessions', () => {
  it.each([
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
    '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
    '2027-03-26', '2027-06-18', '2027-07-05', '2027-12-24', '2028-04-14',
    '2025-01-09', '2012-10-29', '2012-10-30',
  ])('closes on %s', date => expect(isTradingDay(day(date))).toBe(false))

  it.each([
    '2026-10-12', '2026-11-11', '2026-11-27', '2026-12-24',
    '2027-12-31', '2028-07-03', '2021-06-18', '2021-12-31',
  ])('keeps federal-only holidays and early closes open on %s', date => {
    expect(isTradingDay(day(date))).toBe(true)
  })

  it('agrees with the independent XNYS reference for every day from 1998 through 2100', () => {
    const closed = new Set(reference.dates)
    const mismatches: string[] = []
    for (let d = day('1998-01-01'); d < day('2101-01-01'); d.setUTCDate(d.getUTCDate() + 1)) {
      const date = d.toISOString().slice(0, 10)
      const expected = d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !closed.has(date)
      if (isTradingDay(d) !== expected) mismatches.push(date)
    }
    expect(mismatches).toEqual([])
  }, 30_000)

  it.each([
    ['2026-04-06', '2026-04-02'], ['2026-10-12', '2026-10-09'],
    ['2026-10-13', '2026-10-12'], ['2027-01-04', '2026-12-31'],
    ['2028-01-03', '2027-12-31'], ['2026-03-09', '2026-03-06'],
    ['2026-11-02', '2026-10-30'],
  ])('finds the previous session before %s', (date, expected) => {
    expect(formatDateYYYYMMDD(getPreviousTradingDay(day(date)))).toBe(expected)
  })

  it('uses the New York date at UTC rollover and the DST transition', () => {
    expect(formatDateYYYYMMDD(getMarketAnchorDate(new Date('2026-10-13T00:01:00Z')))).toBe('2026-10-12')
    expect(formatDateYYYYMMDD(getMarketAnchorDate(new Date('2026-03-09T03:59:00Z')))).toBe('2026-03-06')
    expect(formatDateYYYYMMDD(getMarketAnchorDate(new Date('2026-03-09T04:01:00Z')))).toBe('2026-03-09')
  })

  it('preserves calendar-Friday S3 keys alongside holiday substitutes', () => {
    expect(formatDateYYYYMMDD(findLastCalendarFriday(day('2026-04-06')))).toBe('2026-04-03')
    expect(formatDateYYYYMMDD(findLastFridayOrMonday(day('2026-04-06')))).toBe('2026-04-06')
    const candidates = getWeeklyPublishCandidateDates(day('2026-06-22'))
    expect(candidates).toContain('2026-06-19')
    expect(candidates).toContain('2026-06-12')
  })

  it.each(['2026-04-03', '2026-04-04', '2026-04-05'])(
    'does not look ahead to the holiday substitute Monday on %s', date => {
      expect(getWeeklyPublishCandidateDates(day(date))).not.toContain('2026-04-06')
    }
  )

  it.each(['2026-04-06', '2026-04-07'])(
    'includes an elapsed holiday substitute Monday on %s without changing existing priority', date => {
      expect(getWeeklyPublishCandidateDates(day(date)).slice(0, 3)).toEqual(['2026-04-03', '2026-04-02', '2026-04-06'])
    }
  )

  it('does not add an ordinary Monday or an exchange-closed Monday', () => {
    expect(getWeeklyPublishCandidateDates(day('2026-10-12'), 2)).toEqual(['2026-10-09', '2026-10-02'])
    expect(getWeeklyPublishCandidateDates(day('2026-01-19'))).not.toContain('2026-01-19')
  })

  it('preserves weekly labels across a Monday exchange holiday', () => {
    expect(classifyWeeklyPredictionRole('2026-09-11', getMarketAnchorDate(day('2026-09-07')))).toBe('next')
    expect(classifyWeeklyPredictionRole('2026-09-11', getMarketAnchorDate(day('2026-09-08')))).toBe('current')
    const range = getWeekDateRange(parseDateYYYYMMDD('2026-09-11'))
    expect([formatDateYYYYMMDD(range.monday), formatDateYYYYMMDD(range.friday)]).toEqual(['2026-09-08', '2026-09-11'])
  })

  it('keeps the weekly 14:50 Chicago cutoff through DST', () => {
    for (const [before, after] of [
      ['2026-03-06T20:49:59Z', '2026-03-06T20:50:00Z'],
      ['2026-03-13T19:49:59Z', '2026-03-13T19:50:00Z'],
    ]) {
      expect(isFridayAfterWeeklyPredictionCutoff(new Date(before))).toBe(false)
      expect(isFridayAfterWeeklyPredictionCutoff(new Date(after))).toBe(true)
    }
    expect(isFridayAfterWeeklyPredictionCutoff(new Date('2026-03-13T05:30:00Z'))).toBe(false)
    expect(isFridayAfterWeeklyPredictionCutoff(new Date('2026-03-06T06:30:00Z'))).toBe(false)
  })

  it.each(['UTC', 'America/Chicago', 'Asia/Tokyo', 'Pacific/Kiritimati'])(
    'produces the same dates with host timezone %s', timezone => {
      const script = `
        const fs = require('fs'), ts = require('typescript'), Module = require('module');
        const filename = process.argv[1];
        const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
        const m = new Module(filename); m._compile(compiled, filename);
        const c = m.exports, d = s => c.parseDateYYYYMMDD(s), f = c.formatDateYYYYMMDD;
        const range = c.getWeekDateRange(d('2026-09-11'));
        const normalRange = c.getWeekDateRange(d('2026-03-13'));
        const placeholderDays = [];
        for (let date = new Date(normalRange.monday); date <= normalRange.friday; date.setUTCDate(date.getUTCDate() + 1)) {
          if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) placeholderDays.push(f(date));
        }
        process.stdout.write(JSON.stringify([
          c.isTradingDay(d('2026-04-03')), c.isTradingDay(d('2027-12-31')),
          f(c.getPreviousTradingDay(d('2026-03-09'))), f(c.getPreviousTradingDay(d('2026-11-02'))),
          f(c.getMarketAnchorDate(d('2026-10-12'))), f(range.monday), f(range.friday),
          f(c.findPreviousWeekCalendarFriday(d('2026-03-16'))),
          c.classifyWeeklyPredictionRole('2026-09-11', c.getMarketAnchorDate(d('2026-09-08'))),
          placeholderDays,
          d('2026-03-13').toLocaleDateString('en-CA', {timeZone: 'America/New_York'}),
        ]));
      `
      const result = execFileSync(process.execPath, ['-e', script, path.resolve(__dirname, '../trading-calendar.ts')], {
        env: { ...process.env, TZ: timezone }, encoding: 'utf8',
      })
      expect(JSON.parse(result)).toEqual([false, true, '2026-03-06', '2026-10-30', '2026-10-12', '2026-09-08', '2026-09-11', '2026-03-06', 'current', ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13'], '2026-03-13'])
    }, 15_000
  )
})
