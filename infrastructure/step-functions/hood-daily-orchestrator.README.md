# Predixa-HOOD-Daily

Morning orchestrator for HOOD (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-HOOD`
2. **Premarket** — `predixa-premarket-HOOD`
3. **3mix** — nested `Predixa-HOOD-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-HOOD-Y2Y3`

## Schedule

`predixa-hood-schedules/predixa-hood-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-HOOD-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **HOOD**. Feeders on tradespark:

- `summary_json/HOOD/{date}.json`
- `model_y2y3/HOOD/chart/latest.json`