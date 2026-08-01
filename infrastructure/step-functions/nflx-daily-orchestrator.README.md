# Predixa-NFLX-Daily

Morning orchestrator for NFLX (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-NFLX`
2. **Premarket** — `predixa-premarket-NFLX`
3. **3mix** — nested `Predixa-NFLX-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-NFLX-Y2Y3`

## Schedule

`predixa-nflx-schedules/predixa-nflx-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-NFLX-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **NFLX**. Feeders on tradespark:

- `summary_json/NFLX/{date}.json`
- `model_y2y3/NFLX/chart/latest.json`