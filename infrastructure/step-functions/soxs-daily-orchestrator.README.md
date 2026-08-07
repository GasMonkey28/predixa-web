# Predixa-SOXS-Daily

Morning orchestrator for SOXS (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-SOXS`
2. **Premarket** — `predixa-premarket-SOXS`
3. **3mix** — nested `Predixa-SOXS-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-SOXS-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-soxs-schedules/predixa-soxs-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-SOXS-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **SOXS**. Feeders on tradespark:

- `summary_json/SOXS/{date}.json`
- `model_y2y3/SOXS/chart/latest.json`