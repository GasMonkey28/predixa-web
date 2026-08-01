# Predixa-QQQ-Daily

Morning orchestrator for QQQ (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-QQQ`
2. **Premarket** — `predixa-premarket-QQQ`
3. **3mix** — nested `Predixa-QQQ-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-QQQ-Y2Y3`

## Schedule

`predixa-qqq-schedules/predixa-qqq-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-QQQ-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **QQQ**. Feeders on tradespark:

- `summary_json/QQQ/{date}.json`
- `model_y2y3/QQQ/chart/latest.json`