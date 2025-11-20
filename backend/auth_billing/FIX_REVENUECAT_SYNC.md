# Fix RevenueCat Subscription Sync Issue

## Problem

Users who subscribed on iOS (via RevenueCat) have `status="trialing"` in the database instead of `status="active"`. This causes:
- Web app blocks access (thinks trial is expired)
- iOS app works fine (uses RevenueCat directly)
- Cross-platform sync issue

## Root Cause

The RevenueCat webhook may not have fired or processed correctly when the subscription was created. The entitlements table still has the old trial status.

## Solution

### Option 1: Manually Fix the Test Account (Quick Fix)

Update the test account's status in DynamoDB:

```bash
# Get the cognito_sub for your test account
# Then update it:
aws dynamodb update-item \
  --table-name predixa_entitlements \
  --key '{"cognito_sub": {"S": "YOUR_COGNITO_SUB"}}' \
  --update-expression "SET #status = :status, platform = :platform, updatedAt = :ua, trial_expires_at = :tea, trial_days_remaining = :tdr" \
  --expression-attribute-names '{"#status": "status"}' \
  --expression-attribute-values '{
    ":status": {"S": "active"},
    ":platform": {"S": "revenuecat"},
    ":ua": {"S": "2025-11-17T20:00:00Z"},
    ":tea": {"NULL": true},
    ":tdr": {"N": "0"}
  }' \
  --region us-east-1
```

### Option 2: Trigger RevenueCat Webhook (Recommended)

1. **Go to RevenueCat Dashboard**
2. **Find the user's subscription**
3. **Manually trigger a webhook** or wait for next renewal
4. **Verify webhook URL** is configured: `https://your-app.vercel.app/api/revenuecat/webhook`

### Option 3: Check RevenueCat Webhook Logs

Check if webhooks are being received:
- Vercel logs: Check `/api/revenuecat/webhook` endpoint logs
- RevenueCat dashboard: Check webhook delivery status

## Prevention

The entitlements API Lambda should handle this, but we can improve it:

1. **Check for RevenueCat subscriptions** when status is "trialing"
2. **Query RevenueCat API** to verify actual subscription status
3. **Auto-sync** if mismatch detected

## Verify Fix

After updating:
1. Test account should show `status="active"` in DynamoDB
2. Web app should grant access
3. iOS app should continue working

## Long-term Solution

Consider adding a sync job that:
- Periodically checks RevenueCat for active subscriptions
- Updates DynamoDB if status is out of sync
- Runs daily via EventBridge (similar to trial_days_remaining update)

