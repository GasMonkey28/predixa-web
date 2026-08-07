# Predixa-AMD-Daily

Morning orchestrator for AMD (same shape as AAPL/AMZN):

1. **Data** — `predixa-data-AMD`
2. **Premarket** — `predixa-premarket-AMD`
3. **3mix** — nested `Predixa-AMD-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-AMD-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-amd-schedules/predixa-amd-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-AMD-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` dropdown includes **AMD**. Feeders on tradespark:

- `summary_json/AMD/{date}.json`
- `model_y2y3/AMD/chart/latest.json`
