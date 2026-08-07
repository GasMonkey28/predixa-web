# Range Reclaim — restore / reverse

**Backup taken:** `pre-range-reclaim_20260807_173113`

## What’s in this backup

| Folder | Contents |
|---|---|
| `local-asl/` | Repo copies of `*-daily-orchestrator.asl.json` + `tradespark-ml-then-tiers.asl.json` **before** Range Reclaim was added |
| `aws-live/` | Live AWS `describe-state-machine` JSON for every `Predixa-*-Daily` + `Tradespark-ML-Then-Tiers` at backup time |

## Reverse a single equity Daily SFN

```powershell
$backup = "C:\Users\malin\Predixa\predixa-web\infrastructure\step-functions\_backups\pre-range-reclaim_20260807_173113\aws-live"
$name = "Predixa-AAPL-Daily"   # change ticker
$j = Get-Content "$backup\$name.json" -Raw | ConvertFrom-Json
# definition may be a JSON string inside the file
$def = $j.definition
aws stepfunctions update-state-machine `
  --state-machine-arn "arn:aws:states:us-east-1:822233328169:stateMachine:$name" `
  --definition $def
```

Or restore from local pre-change ASL:

```powershell
$asl = "C:\Users\malin\Predixa\predixa-web\infrastructure\step-functions\_backups\pre-range-reclaim_20260807_173113\local-asl\aapl-daily-orchestrator.asl.json"
aws stepfunctions update-state-machine `
  --state-machine-arn arn:aws:states:us-east-1:822233328169:stateMachine:Predixa-AAPL-Daily `
  --definition file://$asl
```

## Reverse all equity Dailies from aws-live

```powershell
$backup = "...\aws-live"
Get-ChildItem $backup -Filter "Predixa-*-Daily.json" | ForEach-Object {
  $j = Get-Content $_.FullName -Raw | ConvertFrom-Json
  if (-not $j.name) { return }
  aws stepfunctions update-state-machine `
    --state-machine-arn "arn:aws:states:us-east-1:822233328169:stateMachine:$($j.name)" `
    --definition $j.definition
}
```

## Note

`Predixa-SPY-Daily` does not exist (exit 254 in backup). SPY uses `Tradespark-ML-Then-Tiers` + separate Model2 schedules. Range Reclaim for SPY is a **separate** Lambda schedule (see `tradespark/range_reclaim/README.md`), not inside the equity Daily ASL.
