#!/bin/bash
# Setup EventBridge schedule for Predixa News Briefing Lambda

set -e

FUNCTION_NAME="predixa-news-briefing"
REGION="${AWS_REGION:-us-east-1}"
RULE_NAME="predixa-briefing-schedule"
SCHEDULE="${SCHEDULE:-rate(3 hours)}"  # Default: every 3 hours

echo "Setting up EventBridge schedule for Lambda function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "Schedule: $SCHEDULE"

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

# Create or update EventBridge rule
echo "Creating/updating EventBridge rule..."
aws events put-rule \
  --name "$RULE_NAME" \
  --schedule-expression "$SCHEDULE" \
  --state ENABLED \
  --region "$REGION" \
  --output json > /dev/null

echo "✅ EventBridge rule created/updated"

# Get rule ARN
RULE_ARN=$(aws events describe-rule \
  --name "$RULE_NAME" \
  --region "$REGION" \
  --query 'Arn' \
  --output text)

# Add Lambda permission for EventBridge
echo "Adding Lambda permission for EventBridge..."
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id "eventbridge-${RULE_NAME}" \
  --action "lambda:InvokeFunction" \
  --principal events.amazonaws.com \
  --source-arn "$RULE_ARN" \
  --region "$REGION" \
  --output json 2>/dev/null || echo "Permission may already exist"

# Remove existing targets (if any)
echo "Removing existing targets..."
aws events remove-targets \
  --rule "$RULE_NAME" \
  --ids "1" \
  --region "$REGION" \
  --output json 2>/dev/null || true

# Add Lambda as target
echo "Adding Lambda as target..."
aws events put-targets \
  --rule "$RULE_NAME" \
  --targets "Id=1,Arn=$FUNCTION_ARN" \
  --region "$REGION" \
  --output json > /dev/null

echo "✅ EventBridge schedule configured successfully"
echo ""
echo "Rule details:"
aws events describe-rule \
  --name "$RULE_NAME" \
  --region "$REGION" \
  --query '[Name,ScheduleExpression,State]' \
  --output table

echo ""
echo "To test the schedule manually:"
echo "aws events test-event-pattern --event-pattern '{}' --event '{\"source\":[\"aws.events\"]}'"
echo ""
echo "To disable the schedule:"
echo "aws events disable-rule --name $RULE_NAME --region $REGION"

