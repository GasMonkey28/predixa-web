# Predixa-TSLA-Daily

Morning orchestrator for TSLA (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-TSLA`
2. **Premarket** — `predixa-premarket-TSLA`
3. **3mix** — nested `Predixa-TSLA-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-TSLA-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-tsla-schedules/predixa-tsla-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-TSLA-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **TSLA**. Feeders on tradespark:

- `summary_json/TSLA/{date}.json`
- `model_y2y3/TSLA/chart/latest.json`