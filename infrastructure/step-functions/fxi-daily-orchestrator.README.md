# Predixa-FXI-Daily

Morning orchestrator for FXI (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-FXI`
2. **Premarket** — `predixa-premarket-FXI`
3. **3mix** — nested `Predixa-FXI-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-FXI-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-fxi-schedules/predixa-fxi-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-FXI-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **FXI**. Feeders on tradespark:

- `summary_json/FXI/{date}.json`
- `model_y2y3/FXI/chart/latest.json`