# Predixa-COIN-Daily

Morning orchestrator for COIN (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-COIN`
2. **Premarket** — `predixa-premarket-COIN`
3. **3mix** — nested `Predixa-COIN-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-COIN-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-coin-schedules/predixa-coin-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-COIN-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **COIN**. Feeders on tradespark:

- `summary_json/COIN/{date}.json`
- `model_y2y3/COIN/chart/latest.json`