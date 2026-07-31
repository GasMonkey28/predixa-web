# Predixa-BAC-Daily

Morning orchestrator for BAC (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-BAC`
2. **Premarket** — `predixa-premarket-BAC`
3. **3mix** — nested `Predixa-BAC-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-BAC-Y2Y3`

## Schedule

`predixa-bac-schedules/predixa-bac-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-BAC-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **BAC**. Feeders on tradespark:

- `summary_json/BAC/{date}.json`
- `model_y2y3/BAC/chart/latest.json`