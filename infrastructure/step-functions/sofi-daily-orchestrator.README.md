# Predixa-SOFI-Daily

Morning orchestrator for SOFI (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-SOFI`
2. **Premarket** — `predixa-premarket-SOFI`
3. **3mix** — nested `Predixa-SOFI-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-SOFI-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-sofi-schedules/predixa-sofi-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-SOFI-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **SOFI**. Feeders on tradespark:

- `summary_json/SOFI/{date}.json`
- `model_y2y3/SOFI/chart/latest.json`