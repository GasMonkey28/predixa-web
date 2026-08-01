# Predixa-NVDA-Daily

Morning orchestrator for NVDA (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-NVDA`
2. **Premarket** — `predixa-premarket-NVDA`
3. **3mix** — nested `Predixa-NVDA-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-NVDA-Y2Y3`

## Schedule

`predixa-nvda-schedules/predixa-nvda-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-NVDA-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **NVDA**. Feeders on tradespark:

- `summary_json/NVDA/{date}.json`
- `model_y2y3/NVDA/chart/latest.json`