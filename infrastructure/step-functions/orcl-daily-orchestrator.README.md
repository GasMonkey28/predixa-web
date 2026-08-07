# Predixa-ORCL-Daily

Morning orchestrator for ORCL (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-ORCL`
2. **Premarket** — `predixa-premarket-ORCL`
3. **3mix** — nested `Predixa-ORCL-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-ORCL-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-orcl-schedules/predixa-orcl-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-ORCL-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **ORCL**. Feeders on tradespark:

- `summary_json/ORCL/{date}.json`
- `model_y2y3/ORCL/chart/latest.json`