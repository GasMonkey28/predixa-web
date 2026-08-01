# Predixa-TSLL-Daily

Morning orchestrator for TSLL (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-TSLL`
2. **Premarket** — `predixa-premarket-TSLL`
3. **3mix** — nested `Predixa-TSLL-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-TSLL-Y2Y3`

## Schedule

`predixa-tsll-schedules/predixa-tsll-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-TSLL-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **TSLL**. Feeders on tradespark:

- `summary_json/TSLL/{date}.json`
- `model_y2y3/TSLL/chart/latest.json`