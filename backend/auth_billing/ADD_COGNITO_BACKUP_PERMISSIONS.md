# Add Lambda Permissions for Cognito Backup

## Required Permissions

The Lambda function needs:
1. **Cognito**: `ListUsers` - to read all users from User Pool
2. **S3**: `PutObject` - to save backup files to S3

---

## Step-by-Step: Add Permissions

### Option 1: Add to Existing Role (Recommended)

If you're using `predixa-lambda-execution-role`:

1. **Go to IAM Console**: https://console.aws.amazon.com/iam/
2. **Click "Roles"** in left sidebar
3. **Click on `predixa-lambda-execution-role`**
4. **Click "Add permissions"** → **"Create inline policy"**
5. **Click "JSON" tab**
6. **Paste this policy:**

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

7. **Name it:** `CognitoBackupPermissions`
8. **Click "Create policy"**

---

### Option 2: Via AWS CLI

```powershell
aws iam put-role-policy `
    --role-name predixa-lambda-execution-role `
    --policy-name CognitoBackupPermissions `
    --policy-document '{
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
    }'
```

---

### Option 3: Create S3 Bucket First (If Not Exists)

Before adding permissions, make sure the S3 bucket exists:

```powershell
# Create bucket
aws s3 mb s3://predixa-backups --region us-east-1

# Verify it exists
aws s3 ls | Select-String "predixa-backups"
```

---

## Verify Permissions

After adding, verify in IAM Console:

1. **Go to IAM → Roles → predixa-lambda-execution-role**
2. **Check inline policies** - should see `CognitoBackupPermissions`
3. **Click on it** to verify it has:
   - `cognito-idp:ListUsers`
   - `s3:PutObject`

---

## Complete Permission Summary

Your `predixa-lambda-execution-role` should now have:

### Existing Permissions:
- ✅ CloudWatch Logs (from `AWSLambdaBasicExecutionRole`)
- ✅ DynamoDB: GetItem, PutItem, UpdateItem, DeleteItem
- ✅ Cognito: AdminDeleteUser

### New Permissions (for backup):
- ✅ Cognito: ListUsers
- ✅ S3: PutObject

---

## Test Permissions

After adding, test the Lambda function:

1. **Go to Lambda Console**
2. **Select `predixa-backup-cognito` function**
3. **Click "Test" tab**
4. **Create test event** (empty event is fine)
5. **Click "Test"**
6. **Check result:**
   - ✅ Success: Should see "Backed up X Cognito users"
   - ❌ Error: Check CloudWatch Logs for permission errors

---

## Troubleshooting

**Error: "AccessDenied" for Cognito**
- Verify `cognito-idp:ListUsers` is in the policy
- Check resource ARN matches your User Pool

**Error: "AccessDenied" for S3**
- Verify `s3:PutObject` is in the policy
- Check S3 bucket exists: `predixa-backups`
- Verify resource ARN: `arn:aws:s3:::predixa-backups/cognito-backups/*`

**Error: "Bucket not found"**
- Create the bucket first: `aws s3 mb s3://predixa-backups --region us-east-1`

---

**After adding these permissions, your Lambda function can backup Cognito users!** ✅

