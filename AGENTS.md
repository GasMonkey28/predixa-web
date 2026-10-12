# Trading calendar maintenance

- Use NYSE full-day sessions, not US federal holidays; early-close days remain sessions.
- Keep date-only arithmetic independent of the machine timezone. Shared calendar Dates represent noon UTC on the named New York date.
- Weekly S3 keys use calendar Friday even on a market holiday. Do not replace these keys with a previous trading day.
- Run the calendar and Market Insight caller regression suites when changing these rules.
- See [the 2026-10-12 calendar incident and maintenance notes](docs/trading-calendar-2026-10-12.md) for evidence, limitations, and the first checks if the problem recurs.
