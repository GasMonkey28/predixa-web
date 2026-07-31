# Predixa-F-Daily

Morning orchestrator for F (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-F`
2. **Premarket** — `predixa-premarket-F`
3. **3mix** — nested `Predixa-F-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-F-Y2Y3`

## Schedule

`predixa-f-schedules/predixa-f-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-F-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **F**. Feeders on tradespark:

- `summary_json/F/{date}.json`
- `model_y2y3/F/chart/latest.json`