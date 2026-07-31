# Predixa-BABA-Daily

Morning orchestrator for BABA (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-BABA`
2. **Premarket** — `predixa-premarket-BABA`
3. **3mix** — nested `Predixa-BABA-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-BABA-Y2Y3`

## Schedule

`predixa-baba-schedules/predixa-baba-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-BABA-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **BABA**. Feeders on tradespark:

- `summary_json/BABA/{date}.json`
- `model_y2y3/BABA/chart/latest.json`