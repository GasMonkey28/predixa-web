# Predixa-XOM-Daily

Morning orchestrator for XOM (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-XOM`
2. **Premarket** — `predixa-premarket-XOM`
3. **3mix** — nested `Predixa-XOM-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-XOM-Y2Y3`

## Schedule

`predixa-xom-schedules/predixa-xom-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-XOM-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **XOM**. Feeders on tradespark:

- `summary_json/XOM/{date}.json`
- `model_y2y3/XOM/chart/latest.json`