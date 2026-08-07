# Predixa-MU-Daily

Morning orchestrator for MU (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-MU`
2. **Premarket** — `predixa-premarket-MU`
3. **3mix** — nested `Predixa-MU-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-MU-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-mu-schedules/predixa-mu-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-MU-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **MU**. Feeders on tradespark:

- `summary_json/MU/{date}.json`
- `model_y2y3/MU/chart/latest.json`