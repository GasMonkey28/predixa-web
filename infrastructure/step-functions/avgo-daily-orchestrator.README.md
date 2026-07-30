# Predixa-AVGO-Daily

Morning orchestrator for AVGO (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-AVGO`
2. **Premarket** — `predixa-premarket-AVGO`
3. **3mix** — nested `Predixa-AVGO-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-AVGO-Y2Y3`

## Schedule

`predixa-avgo-schedules/predixa-avgo-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-AVGO-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **AVGO**. Feeders on tradespark:

- `summary_json/AVGO/{date}.json`
- `model_y2y3/AVGO/chart/latest.json`