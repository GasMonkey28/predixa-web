# Predixa-DIS-Daily

Morning orchestrator for DIS (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-DIS`
2. **Premarket** — `predixa-premarket-DIS`
3. **3mix** — nested `Predixa-DIS-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-DIS-Y2Y3`

## Schedule

`predixa-dis-schedules/predixa-dis-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-DIS-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **DIS**. Feeders on tradespark:

- `summary_json/DIS/{date}.json`
- `model_y2y3/DIS/chart/latest.json`