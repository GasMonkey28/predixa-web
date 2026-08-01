# Predixa-SLV-Daily

Morning orchestrator for SLV (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-SLV`
2. **Premarket** — `predixa-premarket-SLV`
3. **3mix** — nested `Predixa-SLV-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-SLV-Y2Y3`

## Schedule

`predixa-slv-schedules/predixa-slv-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-SLV-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **SLV**. Feeders on tradespark:

- `summary_json/SLV/{date}.json`
- `model_y2y3/SLV/chart/latest.json`