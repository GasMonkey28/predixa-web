# Predixa-GLD-Daily

Morning orchestrator for GLD (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-GLD`
2. **Premarket** — `predixa-premarket-GLD`
3. **3mix** — nested `Predixa-GLD-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-GLD-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-gld-schedules/predixa-gld-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-GLD-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **GLD**. Feeders on tradespark:

- `summary_json/GLD/{date}.json`
- `model_y2y3/GLD/chart/latest.json`