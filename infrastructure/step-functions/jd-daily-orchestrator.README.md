# Predixa-JD-Daily

Morning orchestrator for JD (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-JD`
2. **Premarket** — `predixa-premarket-JD`
3. **3mix** — nested `Predixa-JD-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-JD-Y2Y3`

## Schedule

`predixa-jd-schedules/predixa-jd-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-JD-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **JD**. Feeders on tradespark:

- `summary_json/JD/{date}.json`
- `model_y2y3/JD/chart/latest.json`