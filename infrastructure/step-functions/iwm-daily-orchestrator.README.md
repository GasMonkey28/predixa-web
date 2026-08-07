# Predixa-IWM-Daily

Morning orchestrator for IWM (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-IWM`
2. **Premarket** — `predixa-premarket-IWM`
3. **3mix** — nested `Predixa-IWM-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-IWM-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-iwm-schedules/predixa-iwm-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-IWM-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **IWM**. Feeders on tradespark:

- `summary_json/IWM/{date}.json`
- `model_y2y3/IWM/chart/latest.json`