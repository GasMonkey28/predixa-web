# Predixa-BITO-Daily

Morning orchestrator for BITO (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-BITO`
2. **Premarket** — `predixa-premarket-BITO`
3. **3mix** — nested `Predixa-BITO-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-BITO-Y2Y3`

## Schedule

`predixa-bito-schedules/predixa-bito-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-BITO-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **BITO**. Feeders on tradespark:

- `summary_json/BITO/{date}.json`
- `model_y2y3/BITO/chart/latest.json`