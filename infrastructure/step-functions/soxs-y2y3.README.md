# Predixa-SOXS-Y2Y3

Product **Model2** pipeline for SOXS (`y1` / `pred_y2+pred_y3` signals).  
Separate from `Predixa-SOXS-ML-Then-Tiers` (3mix tiers / `features.db`).

## Flow

1. **Premarket** — Tradier → `predixa.db` premarket stub for `as_of_date`
2. **Step1** — sync OHLC/premarket → `model_y2y3.db`
3. **Step2** — x1–x44 + y1…y5 (SPX/ES cols zeroed)
4. **Step3** — RF+MLP baseline α=0.5
5. **Step4** — tuned RF+MLP α=0.3 (13 features) ← Step5 reads this table
6. **Step5** — suggestions with auto price-scaled $ thresholds
7. **Step6** — update yesterday actuals / PnL
8. **Step7** — `model_y2y3/SOXS/chart/latest.json`

## Lambda names

| State | Function |
|-------|----------|
| Premarket | `predixa-premarket-SOXS` |
| Step1…7 | `predixa-y2y3-step{1..7}-SOXS` |

Handlers: `tradespark/ticker-handlers/SOXS/ml/model_y2y3/` (+ `model_3mix/premarket`).

## Input

```json
{"as_of_date": "2026-07-29", "ticker": "SOXS"}
```

## Create / update

```bash
aws stepfunctions create-state-machine \
  --name Predixa-SOXS-Y2Y3 \
  --definition file://infrastructure/step-functions/soxs-y2y3.asl.json \
  --role-arn arn:aws:iam::822233328169:role/TradesparkStepFunctionsRole \
  --type STANDARD \
  --region us-east-1
```

```bash
aws stepfunctions update-state-machine \
  --state-machine-arn arn:aws:states:us-east-1:822233328169:stateMachine:Predixa-SOXS-Y2Y3 \
  --definition file://infrastructure/step-functions/soxs-y2y3.asl.json \
  --region us-east-1
```

## IAM

`TradesparkSFNPolicy` must allow invoke on the 8 Lambdas above (see `infrastructure/iam/TradesparkSFNPolicy.json`).

## Deploy Lambdas

```powershell
cd C:\Users\malin\tradespark\ticker-handlers\SOXS\ml\model_y2y3
.\deploy_all.ps1
```
