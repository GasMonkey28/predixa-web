# Predixa-MSFT-Daily

Morning orchestrator for MSFT (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-MSFT`
2. **Premarket** — `predixa-premarket-MSFT`
3. **3mix** — nested `Predixa-MSFT-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-MSFT-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-msft-schedules/predixa-msft-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-MSFT-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **MSFT**. Feeders on tradespark:

- `summary_json/MSFT/{date}.json`
- `model_y2y3/MSFT/chart/latest.json`