# Predixa Range Reclaim (Model Reclaim)

Adds **Range Reclaim** as the last step of each equity `Predixa-{T}-Daily` orchestrator,
after y2y3 (so Model1 + tiers + y2y3 hands exist for sizing).

## Backup / reverse

Full pre-change backup:

`infrastructure/step-functions/_backups/pre-range-reclaim_20260807_173113/`

See `RESTORE.md` in that folder.

## Logic (summary)

Private full write-up: `C:\Users\malin\tradespark\range_reclaim\README.md`

- Range from Model1: `prev_close + y4/y5`
- Breach OS ≥ **0.3%** of prev close (floor $0.50)
- Long = fade break **below**; Short = fade break **above**
- Size: 1.0 + 0.5 good tier + 0.5 y2y3 agree on longs

## Deploy checklist

1. Create/deploy Lambda `predixa-range-reclaim` from `tradespark/range_reclaim/handler.py`
   - Env: `DB_BUCKET=predixa-…`, `WEB_BUCKET=tradespark-…`, `UPLOAD=1`
   - IAM: read `db/tickers/*`, `db/tradespark.db`, `model2_y2y3/*`; write `range_reclaim/*`
2. Patch local ASL (already done via script) then update AWS SFNs:
   ```powershell
   Get-ChildItem infrastructure\step-functions\*-daily-orchestrator.asl.json | ForEach-Object {
     $t = $_.BaseName.Split('-')[0].ToUpper()
     aws stepfunctions update-state-machine `
       --state-machine-arn "arn:aws:states:us-east-1:822233328169:stateMachine:Predixa-$t-Daily" `
       --definition "file://$($_.FullName)"
   }
   ```
## SPY pipeline (not a separate clock)

SPY has **no** `Predixa-SPY-Daily`. Morning chain is `Tradespark-ML-Then-Tiers`
(scheduled 08:10 / 08:29 CT):

```
PreSync (OHLC) → ML1 → ML2 → ML3 → RateTiers → RangeReclaim → Succeed
```

- Model2 / y2y3 runs on its own `model2-pipeline-*` schedules in parallel.
  Hands are **optional** size bonuses; reclaim still runs after tiers with Model1.
- Soft-fail Catch on RangeReclaim so a reclaim error does not fail morning ML.
- Do **not** use a separate `predixa-spy-range-reclaim-0840` clock (removed).
- Feeder `as_of_date` matches other models (**today’s session**). Breach math may
  still use prior closed bar via `price_as_of` until today’s OHLC exists.

## Equity Daily (local ASL patched; deploy when ready)

Same idea as last step after y2y3 on each `Predixa-{T}-Daily`.

## Soft-fail

ASL `Catch` on RangeReclaim → `Succeed`, so a reclaim error does **not** fail the whole morning Daily run.
