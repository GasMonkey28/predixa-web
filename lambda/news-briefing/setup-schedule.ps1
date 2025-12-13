# PowerShell script to setup EventBridge schedules for Predixa News Briefing Lambda
# Schedule: 30 min during market hours, 1 hour before/after, 3 hours off-hours

$ErrorActionPreference = "Stop"

$FUNCTION_NAME = "predixa-news-briefing"
$REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }

Write-Host "Setting up EventBridge schedules for Lambda function: $FUNCTION_NAME" -ForegroundColor Green
Write-Host "Region: $REGION" -ForegroundColor Green
Write-Host ""

# Get function ARN
$functionInfo = aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --output json | ConvertFrom-Json
$FUNCTION_ARN = $functionInfo.Configuration.FunctionArn

if (-not $FUNCTION_ARN) {
    Write-Host "Error: Lambda function $FUNCTION_NAME not found" -ForegroundColor Red
    exit 1
}

Write-Host "Function ARN: $FUNCTION_ARN" -ForegroundColor Cyan
Write-Host ""

# Helper function to setup a rule
function Setup-Rule {
    param(
        [string]$RuleName,
        [string]$Schedule,
        [string]$Description
    )
    
    Write-Host "Setting up: $Description" -ForegroundColor Yellow
    Write-Host "  Rule: $RuleName" -ForegroundColor Gray
    Write-Host "  Schedule: $Schedule" -ForegroundColor Gray
    
    # Create or update EventBridge rule
    aws events put-rule `
        --name $RuleName `
        --schedule-expression $Schedule `
        --state ENABLED `
        --description $Description `
        --region $REGION `
        --output json | Out-Null
    
    # Get rule ARN
    $ruleInfo = aws events describe-rule --name $RuleName --region $REGION --output json | ConvertFrom-Json
    $RULE_ARN = $ruleInfo.Arn
    
    # Add Lambda permission for EventBridge
    aws lambda add-permission `
        --function-name $FUNCTION_NAME `
        --statement-id "eventbridge-$RuleName" `
        --action "lambda:InvokeFunction" `
        --principal events.amazonaws.com `
        --source-arn $RULE_ARN `
        --region $REGION `
        --output json 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Permission may already exist" -ForegroundColor Gray
    }
    
    # Remove existing targets (if any)
    aws events remove-targets --rule $RuleName --ids "1" --region $REGION --output json 2>$null | Out-Null
    
    # Add Lambda as target
    aws events put-targets `
        --rule $RuleName `
        --targets "Id=1,Arn=$FUNCTION_ARN" `
        --region $REGION `
        --output json | Out-Null
    
    Write-Host "  ✅ Configured" -ForegroundColor Green
    Write-Host ""
}

# Remove old single rule if it exists
$OLD_RULE = "predixa-briefing-schedule"
try {
    $oldRuleInfo = aws events describe-rule --name $OLD_RULE --region $REGION --output json 2>$null | ConvertFrom-Json
    if ($oldRuleInfo) {
        Write-Host "Removing old schedule rule: $OLD_RULE" -ForegroundColor Yellow
        aws events remove-targets --rule $OLD_RULE --ids "1" --region $REGION 2>$null | Out-Null
        aws events delete-rule --name $OLD_RULE --region $REGION 2>$null | Out-Null
        Write-Host "✅ Old rule removed" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    # Rule doesn't exist, continue
}

# Setup multiple rules
# 1. Pre-market (1 hour before): 8:30-9:30 AM ET = 13:30-14:30 UTC
Setup-Rule "predixa-briefing-pre-market" `
    "cron(30 13 * * ? *)" `
    "Pre-market briefing (13:30 UTC = 8:30 AM ET)"

# 2. Market hours: 9:30 AM-4:00 PM ET = 14:30-21:00 UTC, every 30 minutes
Setup-Rule "predixa-briefing-market-hours" `
    "cron(0,30 14-20 * * ? *)" `
    "Market hours briefing (every 30 min, 14:00-20:30 UTC = 9:00 AM-3:30 PM ET)"

# Market close: 4:00 PM ET = 21:00 UTC
Setup-Rule "predixa-briefing-market-close" `
    "cron(0 21 * * ? *)" `
    "Market close briefing (21:00 UTC = 4:00 PM ET)"

# 3. Post-market (1 hour after): 5:00 PM ET = 22:00 UTC
Setup-Rule "predixa-briefing-post-market" `
    "cron(0 22 * * ? *)" `
    "Post-market briefing (22:00 UTC = 5:00 PM ET)"

# 4. Off-hours: Every 3 hours
Setup-Rule "predixa-briefing-off-hours" `
    "rate(3 hours)" `
    "Off-hours briefing (every 3 hours)"

Write-Host "✅ All EventBridge schedules configured successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Schedule Summary:" -ForegroundColor Cyan
Write-Host "  Pre-market: 13:30 UTC (8:30 AM ET)" -ForegroundColor White
Write-Host "  Market hours: Every 30 min from 14:00-20:30 UTC (9:00 AM-3:30 PM ET)" -ForegroundColor White
Write-Host "  Market close: 21:00 UTC (4:00 PM ET)" -ForegroundColor White
Write-Host "  Post-market: 22:00 UTC (5:00 PM ET)" -ForegroundColor White
Write-Host "  Off-hours: Every 3 hours" -ForegroundColor White
Write-Host ""
Write-Host "Total runs per day: ~21" -ForegroundColor Cyan
Write-Host ""
Write-Host "Rule details:" -ForegroundColor Cyan
aws events list-rules `
    --name-prefix "predixa-briefing" `
    --region $REGION `
    --query 'Rules[*].[Name,ScheduleExpression,State]' `
    --output table
Write-Host ""
Write-Host "To disable all schedules:" -ForegroundColor Yellow
Write-Host "  `$rules = aws events list-rules --name-prefix predixa-briefing --region $REGION --query 'Rules[*].Name' --output text" -ForegroundColor Gray
Write-Host "  foreach (`$rule in `$rules) { aws events disable-rule --name `$rule --region $REGION }" -ForegroundColor Gray



