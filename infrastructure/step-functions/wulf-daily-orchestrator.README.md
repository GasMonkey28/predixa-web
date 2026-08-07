# Predixa-WULF-Daily

Morning orchestrator for WULF (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-WULF`
2. **Premarket** — `predixa-premarket-WULF`
3. **3mix** — nested `Predixa-WULF-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-WULF-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-wulf-schedules/predixa-wulf-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-WULF-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **WULF**. Feeders on tradespark:

- `summary_json/WULF/{date}.json`
- `model_y2y3/WULF/chart/latest.json`