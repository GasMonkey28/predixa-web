# Predixa-MSTR-Daily

Morning orchestrator for MSTR (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-MSTR`
2. **Premarket** — `predixa-premarket-MSTR`
3. **3mix** — nested `Predixa-MSTR-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-MSTR-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-mstr-schedules/predixa-mstr-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-MSTR-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **MSTR**. Feeders on tradespark:

- `summary_json/MSTR/{date}.json`
- `model_y2y3/MSTR/chart/latest.json`