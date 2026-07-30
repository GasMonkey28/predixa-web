# Predixa-AAPL-Daily

Morning orchestrator for AAPL:

1. **Data** — `predixa-data-AAPL` (OI / chains → `predixa.db`)
2. **Premarket** — `predixa-premarket-AAPL`
3. **3mix** — nested `Predixa-AAPL-ML-Then-Tiers` (features → ML1/2/3 → tiers)
4. **y2y3** — nested `Predixa-AAPL-Y2Y3` (product Model2; includes its own premarket step again)

## Schedule

EventBridge Scheduler (`America/Chicago`), weekdays **7:30 AM CT** — same slot as the old
`predixa-data-AAPL` EventBridge rules (those AAPL data-only rules should stay **DISABLED**
so data is not double-run).

```bash
aws scheduler create-schedule \
  --name predixa-aapl-daily-0730 \
  --group-name predixa-aapl-schedules \
  --schedule-expression "cron(30 7 ? * MON-FRI *)" \
  --schedule-expression-timezone "America/Chicago" \
  --flexible-time-window Mode=OFF \
  --target '{
    "Arn":"arn:aws:states:us-east-1:822233328169:stateMachine:Predixa-AAPL-Daily",
    "RoleArn":"arn:aws:iam::822233328169:role/predixa-eventbridge-scheduler-role",
    "Input":"{}"
  }'
```

## Manual run

```bash
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:822233328169:stateMachine:Predixa-AAPL-Daily \
  --input "{\"as_of_date\":\"2026-07-29\",\"ticker\":\"AAPL\",\"date\":\"2026-07-29\"}"
```

## Website feeders (predixaweb.com `/tickers`)

Public JSON for the site is served from **tradespark** (same bucket as SPY):

- `summary_json/AAPL/{date}.json` — 3mix letter tiers
- `model_y2y3/AAPL/chart/latest.json` — Model 2 chart

AAPL Lambdas keep DBs on **predixa**. `predixa-tiers-AAPL` and `predixa-y2y3-step7-AAPL`
dual-write those feeder keys to `WEB_BUCKET` (default `tradespark-822233328169-us-east-1`)
after writing to `DB_BUCKET`. Redeploy those two functions after pulling the dual-write change
(Docker Desktop required for image build).

One-time / catch-up mirror:

```bash
aws s3 sync s3://predixa-822233328169-us-east-1/summary_json/AAPL/ \
  s3://tradespark-822233328169-us-east-1/summary_json/AAPL/ --exclude "*" --include "*.json"
aws s3 cp s3://predixa-822233328169-us-east-1/model_y2y3/AAPL/chart/latest.json \
  s3://tradespark-822233328169-us-east-1/model_y2y3/AAPL/chart/latest.json
```
