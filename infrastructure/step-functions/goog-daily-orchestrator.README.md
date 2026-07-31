# Predixa-GOOG-Daily

Morning orchestrator for GOOG (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-GOOG`
2. **Premarket** — `predixa-premarket-GOOG`
3. **3mix** — nested `Predixa-GOOG-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-GOOG-Y2Y3`

## Schedule

`predixa-goog-schedules/predixa-goog-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-GOOG-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **GOOG**. Feeders on tradespark:

- `summary_json/GOOG/{date}.json`
- `model_y2y3/GOOG/chart/latest.json`