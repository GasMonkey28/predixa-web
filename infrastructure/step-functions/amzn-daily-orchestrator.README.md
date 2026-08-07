# Predixa-AMZN-Daily

Morning orchestrator for AMZN (same shape as AAPL):

1. **Data** — `predixa-data-AMZN`
2. **Premarket** — `predixa-premarket-AMZN`
3. **3mix** — nested `Predixa-AMZN-ML-Then-Tiers`
4. **y2y3** — nested `Predixa-AMZN-Y2Y3`
5. **Range Reclaim** � shared Lambda `predixa-range-reclaim` after y2y3 (soft-fail). Writes `range_reclaim/{T}/latest.json`. See `range-reclaim.README.md` + backup `_backups/pre-range-reclaim_*`.

## Schedule

EventBridge Scheduler (`America/Chicago`), weekdays **7:30 AM CT**:
`predixa-amzn-schedules/predixa-amzn-daily-0730`

Standalone `predixa-data-AMZN-schedule-cst/cdt` should stay **DISABLED**.

## Website

`/tickers` dropdown includes **AMZN**. Feeders:

- `summary_json/AMZN/{date}.json`
- `model_y2y3/AMZN/chart/latest.json`

on the public tradespark bucket (dual-written from tiers + y2y3 step7).

## Manual run

```bash
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:822233328169:stateMachine:Predixa-AMZN-Daily \
  --input "{\"as_of_date\":\"2026-07-29\",\"ticker\":\"AMZN\",\"date\":\"2026-07-29\"}"
```
