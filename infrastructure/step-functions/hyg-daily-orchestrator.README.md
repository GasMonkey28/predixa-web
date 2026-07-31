# Predixa-HYG-Daily

Morning orchestrator for HYG (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-HYG`
2. **Premarket** — `predixa-premarket-HYG`
3. **3mix** — nested `Predixa-HYG-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-HYG-Y2Y3`

## Schedule

`predixa-hyg-schedules/predixa-hyg-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-HYG-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **HYG**. Feeders on tradespark:

- `summary_json/HYG/{date}.json`
- `model_y2y3/HYG/chart/latest.json`