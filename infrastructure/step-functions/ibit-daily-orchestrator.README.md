# Predixa-IBIT-Daily

Morning orchestrator for IBIT (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-IBIT`
2. **Premarket** — `predixa-premarket-IBIT`
3. **3mix** — nested `Predixa-IBIT-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-IBIT-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-ibit-schedules/predixa-ibit-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-IBIT-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **IBIT**. Feeders on tradespark:

- `summary_json/IBIT/{date}.json`
- `model_y2y3/IBIT/chart/latest.json`