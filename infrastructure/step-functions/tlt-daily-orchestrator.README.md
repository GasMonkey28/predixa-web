# Predixa-TLT-Daily

Morning orchestrator for TLT (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-TLT`
2. **Premarket** — `predixa-premarket-TLT`
3. **3mix** — nested `Predixa-TLT-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-TLT-Y2Y3`

## Schedule

`predixa-tlt-schedules/predixa-tlt-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-TLT-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **TLT**. Feeders on tradespark:

- `summary_json/TLT/{date}.json`
- `model_y2y3/TLT/chart/latest.json`