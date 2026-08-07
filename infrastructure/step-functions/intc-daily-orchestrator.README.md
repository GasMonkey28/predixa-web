# Predixa-INTC-Daily

Morning orchestrator for INTC (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-INTC`
2. **Premarket** — `predixa-premarket-INTC`
3. **3mix** — nested `Predixa-INTC-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-INTC-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-intc-schedules/predixa-intc-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-INTC-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **INTC**. Feeders on tradespark:

- `summary_json/INTC/{date}.json`
- `model_y2y3/INTC/chart/latest.json`