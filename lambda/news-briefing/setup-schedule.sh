#!/bin/bash
# Setup EventBridge schedules for Predixa News Briefing Lambda
# Schedule: 30 min during market hours, 1 hour before/after, 3 hours off-hours

set -e

FUNCTION_NAME="predixa-news-briefing"
REGION="${AWS_REGION:-us-east-1}"

echo "Setting up EventBridge schedules for Lambda function: $FUNCTION_NAME"
echo "Region: $REGION"
echo ""

# Get function ARN
FUNCTION_ARN=$(aws lambda get-function \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query 'Configuration.FunctionArn' \
  --output text)

if [ -z "$FUNCTION_ARN" ]; then
    echo "Error: Lambda function $FUNCTION_NAME not found"
    exit 1
fi

echo "Function ARN: $FUNCTION_ARN"
echo ""

# Helper function to setup a rule
setup_rule() {
    local RULE_NAME=$1
    local SCHEDULE=$2
    local DESCRIPTION=$3
    
    echo "Setting up: $DESCRIPTION"
    echo "  Rule: $RULE_NAME"
    echo "  Schedule: $SCHEDULE"
    
    # Create or update EventBridge rule
    aws events put-rule \
        --name "$RULE_NAME" \
        --schedule-expression "$SCHEDULE" \
        --state ENABLED \
        --description "$DESCRIPTION" \
        --region "$REGION" \
        --output json > /dev/null
    
    # Get rule ARN
    RULE_ARN=$(aws events describe-rule \
        --name "$RULE_NAME" \
        --region "$REGION" \
        --query 'Arn' \
        --output text)
    
    # Add Lambda permission for EventBridge
    aws lambda add-permission \
        --function-name "$FUNCTION_NAME" \
        --statement-id "eventbridge-${RULE_NAME}" \
        --action "lambda:InvokeFunction" \
        --principal events.amazonaws.com \
        --source-arn "$RULE_ARN" \
        --region "$REGION" \
        --output json 2>/dev/null || echo "  Permission may already exist"
    
    # Remove existing targets (if any)
    aws events remove-targets \
        --rule "$RULE_NAME" \
        --ids "1" \
        --region "$REGION" \
        --output json 2>/dev/null || true
    
    # Add Lambda as target
    aws events put-targets \
        --rule "$RULE_NAME" \
        --targets "Id=1,Arn=$FUNCTION_ARN" \
        --region "$REGION" \
        --output json > /dev/null
    
    echo "  ✅ Configured"
    echo ""
}

# Remove old single rule if it exists
OLD_RULE="predixa-briefing-schedule"
if aws events describe-rule --name "$OLD_RULE" --region "$REGION" &>/dev/null 2>&1; then
    echo "Removing old schedule rule: $OLD_RULE"
    aws events remove-targets --rule "$OLD_RULE" --ids "1" --region "$REGION" 2>/dev/null || true
    aws events delete-rule --name "$OLD_RULE" --region "$REGION" 2>/dev/null || true
    echo "✅ Old rule removed"
    echo ""
fi

# Setup multiple rules
# 1. Pre-market (1 hour before): 8:30-9:30 AM ET = 13:30-14:30 UTC
setup_rule "predixa-briefing-pre-market" \
    "cron(30 13 * * ? *)" \
    "Pre-market briefing (13:30 UTC = 8:30 AM ET)"

# 2. Market hours: 9:30 AM-4:00 PM ET = 14:30-21:00 UTC, every 30 minutes
setup_rule "predixa-briefing-market-hours" \
    "cron(0,30 14-20 * * ? *)" \
    "Market hours briefing (every 30 min, 14:00-20:30 UTC = 9:00 AM-3:30 PM ET)"

# Market close: 4:00 PM ET = 21:00 UTC
setup_rule "predixa-briefing-market-close" \
    "cron(0 21 * * ? *)" \
    "Market close briefing (21:00 UTC = 4:00 PM ET)"

# 3. Post-market (1 hour after): 5:00 PM ET = 22:00 UTC
setup_rule "predixa-briefing-post-market" \
    "cron(0 22 * * ? *)" \
    "Post-market briefing (22:00 UTC = 5:00 PM ET)"

# 4. Off-hours: Every 3 hours (runs at 00:00, 03:00, 06:00, 09:00, 12:00, 23:00 UTC)
setup_rule "predixa-briefing-off-hours" \
    "rate(3 hours)" \
    "Off-hours briefing (every 3 hours)"

echo "✅ All EventBridge schedules configured successfully"
echo ""
echo "Schedule Summary:"
echo "  Pre-market: 13:30 UTC (8:30 AM ET)"
echo "  Market hours: Every 30 min from 14:00-20:30 UTC (9:00 AM-3:30 PM ET)"
echo "  Market close: 21:00 UTC (4:00 PM ET)"
echo "  Post-market: 22:00 UTC (5:00 PM ET)"
echo "  Off-hours: Every 3 hours"
echo ""
echo "Total runs per day: ~21"
echo ""
echo "Rule details:"
aws events list-rules \
    --name-prefix "predixa-briefing" \
    --region "$REGION" \
    --query 'Rules[*].[Name,ScheduleExpression,State]' \
    --output table
echo ""
echo "To disable all schedules:"
echo "  for rule in \$(aws events list-rules --name-prefix predixa-briefing --region $REGION --query 'Rules[*].Name' --output text); do"
echo "    aws events disable-rule --name \$rule --region $REGION"
echo "  done"
