# Predixa-SOXL-Daily

Morning orchestrator for SOXL (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-SOXL`
2. **Premarket** — `predixa-premarket-SOXL`
3. **3mix** — nested `Predixa-SOXL-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-SOXL-Y2Y3`

## Schedule

`predixa-soxl-schedules/predixa-soxl-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-SOXL-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **SOXL**. Feeders on tradespark:

- `summary_json/SOXL/{date}.json`
- `model_y2y3/SOXL/chart/latest.json`