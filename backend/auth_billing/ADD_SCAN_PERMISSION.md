# Add DynamoDB Scan Permission for Update Trial Days Lambda

## Problem
Lambda function `update_trial_days` is getting AccessDeniedException:
```
User: arn:aws:sts::822233328169:assumed-role/lambda-execution-role/update_trial_days 
is not authorized to perform: dynamodb:Scan on resource: arn:aws:dynamodb:us-east-1:822233328169:table/predixa_entitlements
```

## Solution
Add `dynamodb:Scan` permission to the `lambda-execution-role` IAM role.

## Quick Fix (AWS Console)

### Step 1: Go to IAM Console
1. **Go to IAM Console**: https://console.aws.amazon.com/iam/
2. **Click "Roles"** in left sidebar
3. **Search for**: `lambda-execution-role`
4. **Click on the role** to open it

### Step 2: Add Inline Policy
1. **Click "Add permissions"** → **"Create inline policy"**
2. **Click "JSON" tab**
3. **Paste this policy**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:Scan"
         ],
         "Resource": "arn:aws:dynamodb:us-east-1:822233328169:table/predixa_entitlements"
       }
     ]
   }
   ```
4. **Click "Next"**
5. **Name the policy**: `DynamoDBScanEntitlements`
6. **Click "Create policy"**

### Step 3: Verify
1. Go back to Lambda Console → `update_trial_days`
2. Click "Test" again
3. Should work now! ✅

---

## Alternative: AWS CLI

If you prefer using CLI:

```bash
aws iam put-role-policy \
  --role-name lambda-execution-role \
  --policy-name DynamoDBScanEntitlements \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:us-east-1:822233328169:table/predixa_entitlements"
    }]
  }'
```

---

## Verify Permission Added

Check the role has the policy:
```bash
aws iam list-role-policies --role-name lambda-execution-role
```

Should show `DynamoDBScanEntitlements` in the list.

---

## After Adding Permission

1. **Wait 1-2 minutes** (IAM propagation delay)
2. **Test the Lambda again**
3. **Should see**: "📋 Found X entitlement records" (instead of 0)
4. **Should see**: Updates being made to trial_days_remaining

---

## Note

The role `lambda-execution-role` already has:
- ✅ `dynamodb:GetItem`
- ✅ `dynamodb:PutItem`
- ✅ `dynamodb:UpdateItem`

But it's missing:
- ❌ `dynamodb:Scan` (needed for this Lambda)

After adding this permission, the Lambda will be able to scan all entitlements and update trial_days_remaining! 🎉

