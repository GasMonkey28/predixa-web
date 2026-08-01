# Predixa-UBER-Daily

Morning orchestrator for UBER (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-UBER`
2. **Premarket** — `predixa-premarket-UBER`
3. **3mix** — nested `Predixa-UBER-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-UBER-Y2Y3`

## Schedule

`predixa-uber-schedules/predixa-uber-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-UBER-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **UBER**. Feeders on tradespark:

- `summary_json/UBER/{date}.json`
- `model_y2y3/UBER/chart/latest.json`