# Setup EventBridge Trigger for Cognito Backup

## Quick Setup

### Step 1: Go to EventBridge Console

1. **Go to EventBridge Console**: https://console.aws.amazon.com/events/
2. **Click "Rules"** in left sidebar
3. **Click "Create rule"**

### Step 2: Configure Rule

1. **Name**: `daily-cognito-backup`
2. **Description**: `Daily backup of Cognito users to S3` (optional)
3. **Event bus**: `default`
4. **Rule type**: **Schedule**

### Step 3: Schedule Pattern

Choose one:

**Option A: Daily at 3 AM UTC (Recommended)**
- Schedule type: **Recurring schedule**
- Schedule expression: `cron(0 3 * * ? *)`

**Option B: Daily at specific time**
- Schedule type: **Recurring schedule**
- Schedule expression: `cron(0 2 * * ? *)` (2 AM UTC)
- Or: `cron(0 4 * * ? *)` (4 AM UTC)

**Option C: Every 12 hours**
- Schedule type: **Recurring schedule**
- Schedule expression: `cron(0 */12 * * ? *)`

### Step 4: Select Target

1. **Click "Next"**
2. **Select target**:
   - Target type: **AWS service**
   - Select a target: **Lambda function**
   - Function: `predixa-backup-cognito`
3. **Click "Next"**

### Step 5: Configure Tags (Optional)

- Skip or add tags
- Click **"Next"**

### Step 6: Review and Create

1. **Review settings**
2. **Click "Create rule"**

---

## Verify It's Working

### Check Rule Status:
1. Go to EventBridge Console → Rules
2. Verify `daily-cognito-backup` shows **Enabled**

### Test Manually:
1. Go to Lambda Console → `predixa-backup-cognito`
2. Click "Test" tab
3. Create test event (empty is fine)
4. Click "Test"
5. Check CloudWatch Logs for success
6. Check S3: `aws s3 ls s3://predixa-backups/cognito-backups/`

### Wait for First Scheduled Run:
- If you set it to 3 AM UTC, wait until then
- Or change schedule to run in a few minutes for testing:
  - `cron(*/5 * * * ? *)` (every 5 minutes - for testing only!)

---

## Schedule Expression Examples

**Daily at 3 AM UTC:**
```
cron(0 3 * * ? *)
```

**Daily at 2 AM UTC:**
```
cron(0 2 * * ? *)
```

**Every 6 hours:**
```
cron(0 */6 * * ? *)
```

**Every 12 hours:**
```
cron(0 */12 * * ? *)
```

**Every day at midnight UTC:**
```
cron(0 0 * * ? *)
```

---

## Via AWS CLI (Alternative)

```powershell
aws events put-rule `
    --name daily-cognito-backup `
    --schedule-expression "cron(0 3 * * ? *)" `
    --description "Daily backup of Cognito users"

aws lambda add-permission `
    --function-name predixa-backup-cognito `
    --statement-id allow-eventbridge `
    --action "lambda:InvokeFunction" `
    --principal events.amazonaws.com `
    --source-arn "arn:aws:events:us-east-1:ACCOUNT_ID:rule/daily-cognito-backup"

aws events put-targets `
    --rule daily-cognito-backup `
    --targets "Id=1,Arn=arn:aws:lambda:us-east-1:ACCOUNT_ID:function:predixa-backup-cognito"
```

(Replace `ACCOUNT_ID` with your AWS account ID)

---

## Done! ✅

After creating the EventBridge rule:
- ✅ Lambda will run automatically on schedule
- ✅ Cognito users will be backed up daily to S3
- ✅ Backups saved to: `s3://predixa-backups/cognito-backups/YYYY-MM-DD-HHMMSS-cognito-users.json`

---

## Troubleshooting

**Rule not triggering:**
- Check rule is **Enabled** (not Disabled)
- Check schedule expression is correct
- Wait for scheduled time (or test manually first)

**Lambda not being invoked:**
- Check EventBridge has permission to invoke Lambda
- Check Lambda function name matches exactly
- Check CloudWatch Logs for errors

**No backups in S3:**
- Check Lambda execution succeeded (CloudWatch Logs)
- Check S3 bucket name matches environment variable
- Check IAM permissions for S3 PutObject

---

**Your Cognito backup will now run automatically!** 🚀

