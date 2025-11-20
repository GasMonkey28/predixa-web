# Setup Scheduled Trial Days Update

This Lambda function runs daily to update `trial_days_remaining` for all users in trialing status, ensuring the values stay current even when users don't check their entitlements.

## Problem Solved

Previously, `trial_days_remaining` only updated when users checked their entitlements via the API. If users didn't check for several days, the value would stay at 14, causing confusion. This scheduled job ensures all trial days are kept up-to-date automatically.

## Quick Setup

### Step 1: Package the Lambda

1. **Navigate to the backend directory:**
   ```bash
   cd backend/auth_billing
   ```

2. **Package the Lambda function:**
   ```bash
   # On Windows (PowerShell)
   .\package-stripe-webhook.ps1
   
   # Or manually create zip:
   # Copy update_trial_days_lambda.py, config.py, ddb.py, utils.py to package/
   # Then zip the package directory
   ```

   **Note:** You can reuse the existing package structure. The Lambda needs:
   - `update_trial_days_lambda.py`
   - `config.py`
   - `ddb.py`
   - `utils.py`
   - All dependencies from `requirements.txt`

### Step 2: Deploy Lambda Function

1. **Go to Lambda Console**: https://console.aws.amazon.com/lambda/
2. **Click "Create function"**
3. **Configure:**
   - Function name: `predixa-update-trial-days`
   - Runtime: `Python 3.11` (or your preferred version)
   - Architecture: `x86_64`
   - Click **"Create function"**

4. **Upload code:**
   - Scroll to "Code source"
   - Click "Upload from" → ".zip file"
   - Upload your packaged zip file

5. **Configure environment variables:**
   - Go to "Configuration" → "Environment variables"
   - Add the same variables as your other Lambda functions:
     - `ENTITLEMENTS_TABLE` (e.g., `predixa_entitlements`)
     - `AWS_REGION` (e.g., `us-east-1`)
     - Any other required config variables

6. **Set handler:**
   - Go to "Configuration" → "General configuration"
   - Click "Edit"
   - Handler: `update_trial_days_lambda.lambda_handler`
   - Timeout: `5 minutes` (to handle large tables)
   - Memory: `256 MB` (should be sufficient)

7. **Set IAM permissions:**
   - Go to "Configuration" → "Permissions"
   - Click on the execution role (`predixa-lambda-execution-role`)
   - Ensure it has permissions to:
     - `dynamodb:Scan` on `predixa_entitlements` table (required for this Lambda)
     - `dynamodb:UpdateItem` on `predixa_entitlements` table
     - `dynamodb:GetItem` on `predixa_entitlements` table
   - **If Scan permission is missing**, add it using the steps in "Add DynamoDB Scan Permission" section below

### Step 3: Create EventBridge Rule

1. **Go to EventBridge Console**: https://console.aws.amazon.com/events/
2. **Click "Rules"** in left sidebar
3. **Click "Create rule"**

4. **Configure Rule:**
   - Name: `daily-update-trial-days`
   - Description: `Daily update of trial_days_remaining for all trialing users` (optional)
   - Event bus: `default`
   - Rule type: **Schedule**

5. **Schedule Pattern:**
   - Schedule type: **Recurring schedule**
   - Schedule expression: `cron(0 2 * * ? *)` (2 AM UTC daily)
   
   **Alternative schedules:**
   - `cron(0 3 * * ? *)` - 3 AM UTC daily
   - `cron(0 */12 * * ? *)` - Every 12 hours
   - `cron(*/5 * * * ? *)` - Every 5 minutes (for testing only!)

6. **Select Target:**
   - Click "Next"
   - Target type: **AWS service**
   - Select a target: **Lambda function**
   - Function: `predixa-update-trial-days`
   - Click "Next"

7. **Configure Tags (Optional):**
   - Skip or add tags
   - Click **"Next"**

8. **Review and Create:**
   - Review settings
   - Click **"Create rule"**

### Step 4: Grant EventBridge Permission

EventBridge needs permission to invoke your Lambda function:

1. **Go to Lambda Console** → `predixa-update-trial-days`
2. **Go to "Configuration" → "Permissions"**
3. **Click on the execution role** (or resource-based policy)
4. **Add permission** (if not automatically added):
   - Go to "Configuration" → "Permissions" → "Resource-based policy"
   - Or use AWS CLI:
     ```bash
     aws lambda add-permission \
       --function-name predixa-update-trial-days \
       --statement-id allow-eventbridge \
       --action lambda:InvokeFunction \
       --principal events.amazonaws.com \
       --source-arn arn:aws:events:REGION:ACCOUNT_ID:rule/daily-update-trial-days
     ```

### Step 4a: Add DynamoDB Scan Permission (If Needed)

If `predixa-lambda-execution-role` doesn't have `dynamodb:Scan` permission, add it:

1. **Go to IAM Console**: https://console.aws.amazon.com/iam/
2. **Click "Roles"** → Find `predixa-lambda-execution-role`
3. **Click "Add permissions"** → "Create inline policy"
4. **Use JSON editor** and paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:Scan"
         ],
         "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/predixa_entitlements"
       }
     ]
   }
   ```
   Replace `REGION` and `ACCOUNT_ID` with your values.
5. **Name the policy**: `DynamoDBScanEntitlements`
6. **Click "Create policy"**

**Or use AWS CLI:**
```bash
aws iam put-role-policy \
  --role-name predixa-lambda-execution-role \
  --policy-name DynamoDBScanEntitlements \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/predixa_entitlements"
    }]
  }'
```

---

## Verify It's Working

### Test Manually:

1. **Go to Lambda Console** → `predixa-update-trial-days`
2. **Click "Test" tab**
3. **Create test event:**
   ```json
   {
     "version": "0",
     "id": "test-event-id",
     "detail-type": "Scheduled Event",
     "source": "aws.events",
     "time": "2025-11-17T12:00:00Z",
     "region": "us-east-1",
     "resources": ["arn:aws:events:us-east-1:123456789012:rule/test-rule"],
     "detail": {}
   }
   ```
4. **Click "Test"**
5. **Check execution result:**
   - Should show status 200
   - Response body should include summary with counts

### Check CloudWatch Logs:

1. **Go to CloudWatch Console** → Log groups
2. **Find**: `/aws/lambda/predixa-update-trial-days`
3. **Check recent logs** for execution details

### Verify in DynamoDB:

1. **Go to DynamoDB Console** → `predixa_entitlements` table
2. **Check a few trialing users:**
   - `trial_days_remaining` should reflect current days
   - `updatedAt` should be recent (after Lambda ran)

### Wait for First Scheduled Run:

- If scheduled for 2 AM UTC, wait until then
- Or temporarily change schedule to run in a few minutes for testing:
  - `cron(*/5 * * * ? *)` (every 5 minutes - for testing only!)
  - Remember to change it back after testing!

---

## Schedule Expression Examples

**Daily at 2 AM UTC (Recommended):**
```
cron(0 2 * * ? *)
```

**Daily at 3 AM UTC:**
```
cron(0 3 * * ? *)
```

**Every 12 hours:**
```
cron(0 */12 * * ? *)
```

**Every 6 hours:**
```
cron(0 */6 * * ? *)
```

**Every 5 minutes (Testing only!):**
```
cron(*/5 * * * ? *)
```

---

## What the Lambda Does

1. **Scans all entitlements** in `predixa_entitlements` table
2. **For each trialing user:**
   - Calculates current `trial_days_remaining` from `trial_expires_at` and current time
   - Updates the record if value has changed
   - Updates `updatedAt` timestamp
3. **For expired trials:**
   - Updates status to `trial_expired`
   - Sets `trial_days_remaining` to 0
   - Sets `trial_expired_at` timestamp

## Expected Output

The Lambda returns a summary:
```json
{
  "total_entitlements": 42,
  "updated": 15,
  "expired": 2,
  "skipped": 25,
  "errors": 0,
  "timestamp": "2025-11-17T02:00:00.123456Z"
}
```

## Troubleshooting

### Issue: Lambda times out
- **Solution**: Increase timeout to 5 minutes or more
- Check if table is very large - may need to optimize

### Issue: Permission denied
- **Solution**: Check IAM role has DynamoDB permissions:
  - `dynamodb:Scan` on `predixa_entitlements`
  - `dynamodb:UpdateItem` on `predixa_entitlements`

### Issue: Lambda not being triggered
- **Solution**: 
  - Check EventBridge rule is enabled
  - Verify EventBridge has permission to invoke Lambda
  - Check CloudWatch Logs for errors

### Issue: Values not updating
- **Solution**:
  - Check Lambda logs for errors
  - Verify `trial_expires_at` is set correctly
  - Verify status is "trialing" (not "active" or other)

---

## Cost Estimate

- **Lambda invocations**: 1 per day = ~$0.00 (within free tier)
- **DynamoDB scans**: 1 scan per day = minimal cost
- **DynamoDB updates**: Only updates changed values = minimal cost

**Total**: Essentially free for typical usage!

---

## Next Steps

1. ✅ Deploy Lambda function
2. ✅ Create EventBridge rule
3. ✅ Test manually
4. ✅ Verify in DynamoDB
5. ✅ Monitor CloudWatch Logs for first scheduled run

Once set up, the Lambda will run automatically every day and keep all trial days updated! 🎉

