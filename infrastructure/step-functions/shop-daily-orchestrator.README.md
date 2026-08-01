# Predixa-SHOP-Daily

Morning orchestrator for SHOP (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-SHOP`
2. **Premarket** — `predixa-premarket-SHOP`
3. **3mix** — nested `Predixa-SHOP-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-SHOP-Y2Y3`

## Schedule

`predixa-shop-schedules/predixa-shop-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-SHOP-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **SHOP**. Feeders on tradespark:

- `summary_json/SHOP/{date}.json`
- `model_y2y3/SHOP/chart/latest.json`