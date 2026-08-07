# Predixa-HOOD-Daily

Morning orchestrator for HOOD (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-HOOD`
2. **Premarket** — `predixa-premarket-HOOD`
3. **3mix** — nested `Predixa-HOOD-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-HOOD-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-hood-schedules/predixa-hood-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-HOOD-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **HOOD**. Feeders on tradespark:

- `summary_json/HOOD/{date}.json`
- `model_y2y3/HOOD/chart/latest.json`