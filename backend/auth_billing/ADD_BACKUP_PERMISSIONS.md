# Add DynamoDB Backup Permissions

## Problem
Getting error: "IAM Role does not have sufficient permissions to execute the backup"

## Solution
Add DynamoDB backup permissions to your IAM role (or user).

---

## Option 1: Add to Lambda Execution Role (If using that role)

If you're trying to create backup from Lambda or using the Lambda execution role:

1. Go to **IAM Console** → **Roles** → `predixa-lambda-execution-role`
2. Click **"Add permissions"** → **"Create inline policy"**
3. Click **"JSON"** tab
4. Paste this:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:CreateBackup",
                "dynamodb:DescribeBackup",
                "dynamodb:ListBackups",
                "dynamodb:RestoreTableFromBackup"
            ],
            "Resource": [
                "arn:aws:dynamodb:us-east-1:*:table/UserProfiles",
                "arn:aws:dynamodb:us-east-1:*:table/predixa_entitlements",
                "arn:aws:dynamodb:us-east-1:*:table/UserProfiles/backup/*",
                "arn:aws:dynamodb:us-east-1:*:table/predixa_entitlements/backup/*"
            ]
        }
    ]
}
```

5. Name it: `DynamoDBBackupPermissions`
6. Click **"Create policy"**

---

## Option 2: Add to Your User/Role (If creating backup manually)

If you're creating the backup from AWS Console with your own user:

1. Go to **IAM Console** → **Users** (or **Roles** if using a role)
2. Find your user/role
3. Click **"Add permissions"** → **"Create inline policy"**
4. Use the same JSON as above
5. Create the policy

---

## Option 3: Use AWS Managed Policy (Easiest)

1. Go to **IAM Console** → Your user/role
2. Click **"Add permissions"** → **"Attach policies directly"**
3. Search for: `AmazonDynamoDBFullAccess` (or `AmazonDynamoDBReadOnlyAccess` if you only need read)
4. Attach it

**Note**: `AmazonDynamoDBFullAccess` gives full access (including backups). If you want minimal permissions, use Option 1 or 2.

---

## Quick Fix: Use AWS CLI with Your Credentials

If you have AWS CLI configured with your user credentials (not Lambda role), you can create backup via CLI:

```powershell
# Create backup for UserProfiles
aws dynamodb create-backup --table-name UserProfiles --backup-name UserProfiles-backup-$(Get-Date -Format "yyyy-MM-dd") --region us-east-1

# Create backup for predixa_entitlements
aws dynamodb create-backup --table-name predixa_entitlements --backup-name predixa_entitlements-backup-$(Get-Date -Format "yyyy-MM-dd") --region us-east-1
```

This uses your CLI credentials (your IAM user), not the Lambda role.

---

## Verify Permissions

After adding permissions, try creating the backup again in the Console.

---

## Alternative: Skip On-Demand Backup, Just Export Data

If you just want readable data (not a restore point), you can skip the on-demand backup and just export:

```powershell
cd C:\Users\malin\Predixa\predixa-web\backend\auth_billing
New-Item -ItemType Directory -Force -Path backups

# Export to JSON (uses your CLI credentials)
aws dynamodb scan --table-name UserProfiles --region us-east-1 > backups\UserProfiles_backup.json
aws dynamodb scan --table-name predixa_entitlements --region us-east-1 > backups\predixa_entitlements_backup.json
```

This doesn't require backup permissions, just read permissions (which you likely already have).

---

## Recommendation

**For testing purposes**: Just export the data using `aws dynamodb scan` (Option 3 above). It's simpler and gives you readable JSON.

**For production safety**: Add backup permissions and create on-demand backups.


