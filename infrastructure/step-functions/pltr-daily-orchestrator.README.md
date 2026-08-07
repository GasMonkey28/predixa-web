# Predixa-PLTR-Daily

Morning orchestrator for PLTR (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-PLTR`
2. **Premarket** — `predixa-premarket-PLTR`
3. **3mix** — nested `Predixa-PLTR-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-PLTR-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-pltr-schedules/predixa-pltr-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-PLTR-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **PLTR**. Feeders on tradespark:

- `summary_json/PLTR/{date}.json`
- `model_y2y3/PLTR/chart/latest.json`