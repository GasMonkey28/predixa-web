# Deploys the MoneyFlowHorizon state to all 44 remaining Predixa-<T>-Daily
# step functions (SPY/QQQ/NVDA/TSLA already deployed separately).
# Run once from this directory (infrastructure/step-functions/).

$ErrorActionPreference = "Stop"
$Region = "us-east-1"
$RoleArn = "arn:aws:iam::822233328169:role/TradesparkStepFunctionsRole"

$Tickers = @(
  "AAPL","AMZN","AMD","AVGO","BA","BABA","BAC","BITO","COIN","DIS","EFA","F",
  "FXI","GLD","GOOG","HOOD","HYG","IBIT","INTC","IWM","JD","JPM","MARA","META",
  "MRNA","MSFT","MSTR","MU","NFLX","ORCL","PLTR","SHOP","SLV","SMCI","SOFI",
  "SOXL","SOXS","TLT","TQQQ","TSLL","UBER","WMT","WULF","XOM"
)

$failed = @()
foreach ($T in $Tickers) {
    $tl = $T.ToLower()
    $file = "$tl-daily-orchestrator.asl.json"
    Write-Host "Deploying $T ($file)..." -ForegroundColor Cyan
    aws stepfunctions update-state-machine `
        --region $Region `
        --state-machine-arn "arn:aws:states:$Region`:822233328169:stateMachine:Predixa-$T-Daily" `
        --definition "file://$PWD/$file" `
        --role-arn $RoleArn `
        --query "{ticker:'$T',updateDate:updateDate}" --output json
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $T" -ForegroundColor Red
        $failed += $T
    }
}

Write-Host ""
if ($failed.Count -eq 0) {
    Write-Host "All 44 state machines updated successfully." -ForegroundColor Green
} else {
    Write-Host "Failed tickers: $($failed -join ', ')" -ForegroundColor Red
}
