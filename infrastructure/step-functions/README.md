# Tradespark-ML-Then-Tiers

## Flow (trading days)

1. **PreSyncDb** — merge **prior NYSE session** `ml_out/` + `summary_json/` into `db/tradespark.db`, upload once.
2. **ML1 → ML2 → ML3** — S3 JSON only (no DB upload).
3. **RateTiers** — `as_of` = **today’s trading day** (`run_as_of` from PreSync); writes `summary_json/` only.

Example: Monday run → PreSync **Friday**; tiers rate **Monday**.

## Prevent overlapping runs

Standard workflows do not support a simple “max 1 concurrent execution” API on the state machine itself. To avoid two ML+tier pipelines writing at once:

1. **Start with a dated execution name** (fails if that name is already open):
   ```bash
   aws stepfunctions start-execution \
     --state-machine-arn arn:aws:states:us-east-1:822233328169:stateMachine:Tradespark-ML-Then-Tiers \
     --name "ml-tiers-2026-05-28" \
     --input '{"as_of":"2026-05-28"}'
   ```
2. **Do not** run backfill or manual tiers against `db/tradespark.db` while this execution is `RUNNING`.
3. Schedule tickers to finish **before** this state machine (tickers are the main DB writers).

## IAM (Step Functions role)

`TradesparkStepFunctionsRole` / `TradesparkSFNPolicy` must allow `lambda:InvokeFunction` on **all** states, including `tradespark-sync-daily-db`. Policy source: `infrastructure/iam/TradesparkSFNPolicy.json`.

```bash
aws iam put-role-policy --role-name TradesparkStepFunctionsRole --policy-name TradesparkSFNPolicy \
  --policy-document file://infrastructure/iam/TradesparkSFNPolicy.json
```

## Deploy definition

```bash
aws stepfunctions update-state-machine \
  --state-machine-arn arn:aws:states:us-east-1:822233328169:stateMachine:Tradespark-ML-Then-Tiers \
  --definition file://infrastructure/step-functions/tradespark-ml-then-tiers.asl.json \
  --role-arn arn:aws:iam::822233328169:role/TradesparkStepFunctionsRole
```

## Tiers Lambda

Production `tradespark-daily-tiers` uses `STORE_IN_DB=0`: reads `db/tradespark.db`, writes `summary_json/` only (no DB upload-back).
