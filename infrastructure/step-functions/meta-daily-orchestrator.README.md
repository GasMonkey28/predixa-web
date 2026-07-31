# Predixa-META-Daily

Morning orchestrator for META (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-META`
2. **Premarket** — `predixa-premarket-META`
3. **3mix** — nested `Predixa-META-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-META-Y2Y3`

## Schedule

`predixa-meta-schedules/predixa-meta-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-META-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **META**. Feeders on tradespark:

- `summary_json/META/{date}.json`
- `model_y2y3/META/chart/latest.json`