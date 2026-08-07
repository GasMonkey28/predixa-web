# Predixa-MRNA-Daily

Morning orchestrator for MRNA (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-MRNA`
2. **Premarket** — `predixa-premarket-MRNA`
3. **3mix** — nested `Predixa-MRNA-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-MRNA-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-mrna-schedules/predixa-mrna-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-MRNA-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **MRNA**. Feeders on tradespark:

- `summary_json/MRNA/{date}.json`
- `model_y2y3/MRNA/chart/latest.json`