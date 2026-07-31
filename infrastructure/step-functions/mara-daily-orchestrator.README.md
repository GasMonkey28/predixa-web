# Predixa-MARA-Daily

Morning orchestrator for MARA (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-MARA`
2. **Premarket** — `predixa-premarket-MARA`
3. **3mix** — nested `Predixa-MARA-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-MARA-Y2Y3`

## Schedule

`predixa-mara-schedules/predixa-mara-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-MARA-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **MARA**. Feeders on tradespark:

- `summary_json/MARA/{date}.json`
- `model_y2y3/MARA/chart/latest.json`