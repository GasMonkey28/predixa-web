# Predixa-WMT-Daily

Morning orchestrator for WMT (same shape as AAPL/AMZN/AMD):

1. **Data** — `predixa-data-WMT`
2. **Premarket** — `predixa-premarket-WMT`
3. **3mix** — nested `Predixa-WMT-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-WMT-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

`predixa-wmt-schedules/predixa-wmt-daily-0730` — weekdays **7:30 AM America/Chicago**.

Standalone `predixa-data-WMT-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` includes **WMT**. Feeders on tradespark:

- `summary_json/WMT/{date}.json`
- `model_y2y3/WMT/chart/latest.json`