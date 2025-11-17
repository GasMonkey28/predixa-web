# Setup Automatic Scheduled Backups

## Overview
Set up automated backups for:
1. DynamoDB UserProfiles table
2. DynamoDB predixa_entitlements table
3. Cognito User Pool

---

## 1. DynamoDB - Point-in-Time Recovery (PITR) - Recommended

**Best option**: Enable Point-in-Time Recovery (PITR) - automatic continuous backups

### Steps:

1. **Go to DynamoDB Console**
   - https://console.aws.amazon.com/dynamodb/
   - Click **"Tables"** in left sidebar

2. **Enable PITR for UserProfiles**
   - Click on **`UserProfiles`** table
   - Go to **"Backups"** tab
   - Click **"Enable"** next to "Point-in-time recovery"
   - Click **"Enable"** to confirm
   - ✅ This enables automatic continuous backups (can restore to any point in last 35 days)

3. **Enable PITR for predixa_entitlements**
   - Click on **`predixa_entitlements`** table
   - Go to **"Backups"** tab
   - Click **"Enable"** next to "Point-in-time recovery"
   - Click **"Enable"** to confirm

### Benefits:
- ✅ Automatic - no scheduling needed
- ✅ Continuous - backs up every change
- ✅ Can restore to any second in last 35 days
- ✅ No manual intervention required

### Cost:
- ~$0.20 per GB per month (very affordable)

---

## 2. DynamoDB - Scheduled On-Demand Backups (Alternative)

If you prefer scheduled on-demand backups instead of PITR:

### Option A: AWS Backup Service (Recommended)

1. **Go to AWS Backup Console**
   - https://console.aws.amazon.com/backup/
   - Click **"Backup plans"** in left sidebar

2. **Create Backup Plan**
   - Click **"Create backup plan"**
   - Choose **"Build a new plan"**
   - Plan name: `dynamodb-daily-backup`
   - Backup rule:
     - Rule name: `daily-dynamodb-backup`
     - Backup frequency: **Daily**
     - Backup window: Choose time (e.g., 2:00 AM UTC)
     - Retention: **30 days** (or your preference)
     - Copy to another region: Optional
   - Click **"Create plan"**

3. **Assign Resources**
   - Click **"Assign resources"**
   - Resource assignment name: `dynamodb-tables`
   - Select resources:
     - Choose **"DynamoDB"**
     - Select both tables:
       - `UserProfiles`
       - `predixa_entitlements`
   - Click **"Assign resources"**

### Option B: EventBridge + Lambda (Custom)

Create a Lambda function that runs on schedule:

1. **Create Lambda Function**
   - Name: `predixa-backup-dynamodb`
   - Runtime: Python 3.11
   - Handler: `backup_lambda.lambda_handler`

2. **Add Code** (see `backup_dynamodb_lambda.py` below)

3. **Create EventBridge Rule**
   - Go to EventBridge Console
   - Create rule: `daily-dynamodb-backup`
   - Schedule: `cron(0 2 * * ? *)` (2 AM daily)
   - Target: Lambda function `predixa-backup-dynamodb`

---

## 3. Cognito - Scheduled Backup (Lambda Function)

Cognito doesn't have built-in scheduled backups. Create a Lambda function:

### Steps:

1. **Create Lambda Function**
   - Name: `predixa-backup-cognito`
   - Runtime: Python 3.11
   - Handler: `backup_cognito_lambda.lambda_handler`
   - Timeout: 5 minutes
   - Memory: 256 MB

2. **Add Code** (see `backup_cognito_lambda.py` below)

3. **Set Environment Variables**
   - `COGNITO_USER_POOL_ID`: `us-east-1_iYC6qs6H2`
   - `S3_BUCKET`: `predixa-backups` (or your backup bucket)
   - `AWS_REGION`: `us-east-1`

4. **Create S3 Bucket for Backups**
   ```powershell
   aws s3 mb s3://predixa-backups --region us-east-1
   ```

5. **Add IAM Permissions to Lambda Role**
   - `cognito-idp:ListUsers`
   - `s3:PutObject`
   - `s3:GetObject`

6. **Create EventBridge Rule**
   - Schedule: `cron(0 3 * * ? *)` (3 AM daily)
   - Target: Lambda function `predixa-backup-cognito`

---

## 4. Complete Setup Summary

### Recommended Setup:

| Service | Backup Method | Schedule | Retention |
|---------|--------------|----------|-----------|
| DynamoDB UserProfiles | **PITR** (Point-in-Time Recovery) | Continuous | 35 days |
| DynamoDB predixa_entitlements | **PITR** (Point-in-Time Recovery) | Continuous | 35 days |
| Cognito User Pool | **Lambda + S3** | Daily (3 AM) | 90 days |

---

## Quick Setup Commands

### Enable PITR for DynamoDB (CLI):

```powershell
# Enable PITR for UserProfiles
aws dynamodb update-continuous-backups `
    --table-name UserProfiles `
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true `
    --region us-east-1

# Enable PITR for predixa_entitlements
aws dynamodb update-continuous-backups `
    --table-name predixa_entitlements `
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true `
    --region us-east-1

# Verify PITR is enabled
aws dynamodb describe-continuous-backups --table-name UserProfiles --region us-east-1
aws dynamodb describe-continuous-backups --table-name predixa_entitlements --region us-east-1
```

---

## Lambda Function Code

### backup_cognito_lambda.py

```python
"""
Lambda function to backup Cognito users to S3 on schedule.
"""
import json
import boto3
from datetime import datetime
import os

cognito = boto3.client('cognito-idp')
s3 = boto3.client('s3')

COGNITO_USER_POOL_ID = os.getenv('COGNITO_USER_POOL_ID')
S3_BUCKET = os.getenv('S3_BUCKET', 'predixa-backups')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

def lambda_handler(event, context):
    """Backup Cognito users to S3."""
    try:
        # Get all users
        response = cognito.list_users(
            UserPoolId=COGNITO_USER_POOL_ID
        )
        
        users = response.get('Users', [])
        
        # Create backup filename with timestamp
        timestamp = datetime.utcnow().strftime('%Y-%m-%d-%H%M%S')
        filename = f'cognito-backups/{timestamp}-cognito-users.json'
        
        # Upload to S3
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=filename,
            Body=json.dumps(users, default=str),
            ContentType='application/json'
        )
        
        print(f"✅ Backed up {len(users)} Cognito users to s3://{S3_BUCKET}/{filename}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'users_backed_up': len(users),
                's3_key': filename
            })
        }
        
    except Exception as e:
        print(f"❌ Error backing up Cognito users: {e}")
        raise
```

---

## Verification

After setup, verify backups are working:

### Check DynamoDB PITR:
```powershell
aws dynamodb describe-continuous-backups --table-name UserProfiles --region us-east-1
# Should show: "PointInTimeRecoveryStatus": "ENABLED"
```

### Check Cognito Backups in S3:
```powershell
aws s3 ls s3://predixa-backups/cognito-backups/
```

### Check EventBridge Rules:
- Go to EventBridge Console → Rules
- Verify rules are enabled and running

---

## Cost Estimate

- **DynamoDB PITR**: ~$0.20/GB/month (very affordable)
- **S3 Storage**: ~$0.023/GB/month (first 50 TB)
- **Lambda Invocations**: Free tier (1M requests/month free)
- **EventBridge**: Free tier (14M custom events/month free)

**Total**: Very low cost for peace of mind!

---

## Next Steps

1. ✅ Enable PITR for both DynamoDB tables (recommended)
2. ✅ Create S3 bucket for Cognito backups
3. ✅ Create Lambda function for Cognito backup
4. ✅ Set up EventBridge rule for daily Cognito backup
5. ✅ Verify backups are running

---

**Your data will be automatically backed up!** 🚀


