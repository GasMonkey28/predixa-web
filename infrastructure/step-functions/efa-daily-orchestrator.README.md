# Predixa-EFA-Daily

Morning orchestrator for EFA (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-EFA`
2. **Premarket** — `predixa-premarket-EFA`
3. **3mix** — nested `Predixa-EFA-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-EFA-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-efa-schedules/predixa-efa-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-EFA-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **EFA**. Feeders on tradespark:

- `summary_json/EFA/{date}.json`
- `model_y2y3/EFA/chart/latest.json`