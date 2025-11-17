# Setup Scheduled Cognito Backup

## Quick Setup Guide

### Step 1: Create S3 Bucket for Backups

```powershell
aws s3 mb s3://predixa-backups --region us-east-1
```

### Step 2: Create Lambda Function

1. **Go to Lambda Console**: https://console.aws.amazon.com/lambda/
2. **Click "Create function"**
3. **Choose "Author from scratch"**
4. **Fill in:**
   - Function name: `predixa-backup-cognito`
   - Runtime: `Python 3.11`
   - Architecture: `x86_64`
   - Execution role: `predixa-lambda-execution-role` (or create new)
5. **Click "Create function"**

### Step 3: Upload Code

1. **In Lambda function page**, scroll to "Code source"
2. **Delete the default code**
3. **Copy and paste** the code from `backup_cognito_lambda.py`
4. **Click "Deploy"**

### Step 4: Add Environment Variables

1. **Go to "Configuration" tab**
2. **Click "Environment variables"**
3. **Add these:**
   - `COGNITO_USER_POOL_ID` = `us-east-1_iYC6qs6H2`
   - `S3_BUCKET` = `predixa-backups`
   - `AWS_REGION` = `us-east-1`
4. **Click "Save"**

### Step 5: Add IAM Permissions

1. **Go to "Configuration" → "Permissions"**
2. **Click on the execution role name**
3. **Click "Add permissions" → "Create inline policy"**
4. **Click "JSON" tab**
5. **Paste this:**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:ListUsers"
            ],
            "Resource": "arn:aws:cognito-idp:us-east-1:*:userpool/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::predixa-backups/cognito-backups/*"
        }
    ]
}
```

6. **Name it:** `CognitoBackupPermissions`
7. **Click "Create policy"**

### Step 6: Create EventBridge Rule (Schedule)

1. **Go to EventBridge Console**: https://console.aws.amazon.com/events/
2. **Click "Rules" in left sidebar**
3. **Click "Create rule"**
4. **Fill in:**
   - Name: `daily-cognito-backup`
   - Description: `Daily backup of Cognito users`
   - Event bus: `default`
   - Rule type: **Schedule**
5. **Schedule pattern:**
   - Schedule type: **Recurring schedule**
   - Schedule expression: `cron(0 3 * * ? *)` (3 AM UTC daily)
   - Or: `rate(1 day)` (every day at creation time)
6. **Click "Next"**
7. **Select target:**
   - Target type: **AWS service**
   - Select a target: **Lambda function**
   - Function: `predixa-backup-cognito`
8. **Click "Next"**
9. **Configure tags** (optional) → **Next**
10. **Review and create** → **Create rule**

### Step 7: Test It

1. **Go back to Lambda Console**
2. **Select `predixa-backup-cognito` function**
3. **Click "Test" tab**
4. **Create test event** (use default empty event)
5. **Click "Test"**
6. **Check CloudWatch Logs** for success message
7. **Check S3 bucket** for backup file:
   ```powershell
   aws s3 ls s3://predixa-backups/cognito-backups/
   ```

---

## Verify It's Working

### Check S3 Backups:
```powershell
aws s3 ls s3://predixa-backups/cognito-backups/
```

### Check EventBridge Rule:
- Go to EventBridge Console → Rules
- Verify `daily-cognito-backup` is **Enabled**

### Check Lambda Logs:
- Go to Lambda Console → `predixa-backup-cognito` → Monitor tab
- Check CloudWatch Logs for daily executions

---

## Schedule Options

**Daily at 3 AM UTC:**
```
cron(0 3 * * ? *)
```

**Daily at 2 AM UTC:**
```
cron(0 2 * * ? *)
```

**Every 12 hours:**
```
cron(0 */12 * * ? *)
```

**Every 6 hours:**
```
cron(0 */6 * * ? *)
```

---

## Done! ✅

Your Cognito users will be automatically backed up daily to S3!

**Backup location:** `s3://predixa-backups/cognito-backups/YYYY-MM-DD-HHMMSS-cognito-users.json`

---

## Troubleshooting

**Error: "Access Denied"**
- Check IAM role has `cognito-idp:ListUsers` permission
- Check IAM role has `s3:PutObject` permission

**Error: "Bucket not found"**
- Make sure S3 bucket `predixa-backups` exists
- Check bucket name matches environment variable

**No backups appearing:**
- Check EventBridge rule is enabled
- Check Lambda function is working (test it)
- Check CloudWatch Logs for errors


