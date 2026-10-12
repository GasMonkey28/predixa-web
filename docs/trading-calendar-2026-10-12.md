# NYSE calendar correction, 2026-10-12

## Confirmed cause and scope

Production GitHub deployment 6927300669 succeeded on 2026-10-08 at commit `c4d40a0179c0cda79db35726e3138f9eaaa6031c`. Its frontend calendar omitted Good Friday and incorrectly observed a Saturday New Year's Day on the preceding Friday. The same helper also constructed calendar dates in the host timezone, so UTC servers and browsers in other timezones could disagree about weekly date ranges.

The missing 2026-10-12 daily SPY tier had a separate backend root cause: use of the US federal holiday calendar. That backend incident was already repaired and its final pipeline recovered. This web change does not rerun models, fabricate preview artifacts, or change daily-tier data.

## Correction

- Calculate recurring NYSE full-day closures, including Good Friday and the exchange-specific New Year's Day rule. Juneteenth starts in 2022; MLK Day starts in 1998. Record known extraordinary closures since 1998 separately.
- Keep half-day sessions and Columbus/Veterans Days open. Use UTC arithmetic for date-only values while interpreting instants in America/New_York.
- Preserve calendar-Friday weekly object keys in Market Insight and existing weekly-publish candidates. Add a deferred Monday candidate only once that Monday has arrived and is a trading day.
- Keep weekly 14:50 America/Chicago publication timing, using a 00–23 clock so Friday midnight is not mistaken for after the cutoff.
- Make chart date construction and placeholder labels follow the same New York calendar dates.

## Verification

The full Jest suite passes: 7 suites / 82 tests. Calendar tests compare every day from 1998 through 2100 against the independently generated `python-holidays 0.104` XNYS full-day closure fixture, and cover the official NYSE 2026–2028 dates, exceptional closures, half days, UTC rollover, DST, four host timezones, and weekly publication boundaries. The actual Market Insight builder is tested with mocked network responses to verify the resulting S3 keys.

Reference: <https://www.nyse.com/trade/hours-calendars>. The committed reference fixture is test data only; runtime rules have no fixed final year and need no network access or new package dependency.

## Limits and first response if this recurs

Extraordinary future exchange closures cannot be predicted. Add newly announced full-day closures to the exception set and update the independent fixture; do not substitute a federal calendar. The tested modern historical range begins in 1998, not the entire history of the exchange.

First check the exact New York session date, the deployed commit, and the actual S3 object's date/key. Distinguish a missing pipeline output from a client date-selection error. Preserve existing model snapshots and missed-run history. Do not rerun a model or overwrite a valid final artifact just to make a calendar or health warning disappear.
