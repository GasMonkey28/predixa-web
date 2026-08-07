# Predixa-JPM-Daily

Morning orchestrator for JPM (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-JPM`
2. **Premarket** — `predixa-premarket-JPM`
3. **3mix** — nested `Predixa-JPM-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-JPM-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-jpm-schedules/predixa-jpm-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-JPM-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **JPM**. Feeders on tradespark:

- `summary_json/JPM/{date}.json`
- `model_y2y3/JPM/chart/latest.json`