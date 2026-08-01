# Predixa-SMCI-Daily

Morning orchestrator for SMCI (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-SMCI`
2. **Premarket** — `predixa-premarket-SMCI`
3. **3mix** — nested `Predixa-SMCI-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-SMCI-Y2Y3`

## Schedule

`predixa-smci-schedules/predixa-smci-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-SMCI-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **SMCI**. Feeders on tradespark:

- `summary_json/SMCI/{date}.json`
- `model_y2y3/SMCI/chart/latest.json`