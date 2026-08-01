# Predixa-TSLA-Daily

Morning orchestrator for TSLA (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-TSLA`
2. **Premarket** — `predixa-premarket-TSLA`
3. **3mix** — nested `Predixa-TSLA-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-TSLA-Y2Y3`

## Schedule

`predixa-tsla-schedules/predixa-tsla-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-TSLA-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **TSLA**. Feeders on tradespark:

- `summary_json/TSLA/{date}.json`
- `model_y2y3/TSLA/chart/latest.json`