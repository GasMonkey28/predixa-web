# Duplicate Email Prevention Setup Guide

This guide explains how to implement duplicate email prevention and handle existing duplicates.

## Overview

**Problem**: Users can create multiple accounts with the same email:
- One account via email/password signup
- Another account via Google Sign-In (same Gmail)

**Solution**: Pre-Signup Lambda that checks for existing emails before allowing signup.

---

## Step 1: Create EmailIndex GSI on UserProfiles

The Pre-Signup Lambda needs to query users by email. We need a Global Secondary Index (GSI).

### Option A: AWS Console

1. Go to [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Click on **UserProfiles** table
3. Click **"Indexes"** tab
4. Click **"Create index"**
5. Configure:
   - **Partition key**: `email` (String)
   - **Index name**: `EmailIndex`
   - **Projection**: All attributes
6. Click **"Create index"**

### Option B: AWS CLI

```bash
aws dynamodb update-table \
  --table-name UserProfiles \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --global-secondary-index-updates \
    "[{
      \"Create\": {
        \"IndexName\": \"EmailIndex\",
        \"KeySchema\": [{\"AttributeName\": \"email\", \"KeyType\": \"HASH\"}],
        \"Projection\": {\"ProjectionType\": \"ALL\"},
        \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}
      }
    }]" \
  --region us-east-1
```

**Note**: If your table uses "On-demand" billing, remove the `ProvisionedThroughput` line.

### Option C: Check if EmailIndex Already Exists

```bash
aws dynamodb describe-table --table-name UserProfiles --region us-east-1 | grep EmailIndex
```

---

## Step 2: Deploy Pre-Signup Lambda

### 2.1 Create Lambda Function

```bash
cd backend/auth_billing

# Create deployment package
zip -r pre_signup.zip pre_signup_lambda.py config.py ddb.py

# Create Lambda function
aws lambda create-function \
  --function-name predixa-pre-signup \
  --runtime python3.12 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler pre_signup_lambda.lambda_handler \
  --zip-file fileb://pre_signup.zip \
  --timeout 10 \
  --region us-east-1
```

### 2.2 Add DynamoDB Permissions

The Lambda needs permission to query the EmailIndex:

```bash
# Attach DynamoDB read policy
aws iam attach-role-policy \
  --role-name lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess
```

Or create a custom policy for just the UserProfiles table:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/UserProfiles/index/EmailIndex"
      ]
    }
  ]
}
```

### 2.3 Attach Lambda to Cognito User Pool

```bash
# Get your User Pool ID
USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 1 --query 'UserPools[0].Id' --output text)

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function --function-name predixa-pre-signup --query 'Configuration.FunctionArn' --output text)

# Attach Pre-Signup trigger
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --lambda-config PreSignUp=$LAMBDA_ARN \
  --region us-east-1
```

---

## Step 3: Handle Existing Duplicates

### Option A: Leave Existing Duplicates (Recommended for Now)

**You can leave existing duplicates** - they won't cause major issues:
- ✅ New signups will be prevented
- ✅ Existing users can continue using their accounts
- ✅ No data loss

**When to clean up**:
- If you notice users complaining about confusion
- Before a major marketing campaign
- When you have time to review each duplicate manually

### Option B: Find and Review Duplicates

Use the provided script to find duplicates:

```bash
cd backend/auth_billing
python find_duplicate_users.py
```

This will show you all duplicate emails without deleting anything.

### Option C: Delete Duplicates (Use with Caution!)

**⚠️ WARNING**: This will permanently delete user accounts. Make sure you:
1. Backup your data first
2. Review each duplicate carefully
3. Keep the account with the most activity/subscription

**Dry run first** (shows what would be deleted):
```bash
python find_duplicate_users.py --dry-run
```

**Actually delete** (keeps oldest account, deletes others):
```bash
python find_duplicate_users.py --delete
```

**Manual deletion** (delete specific user):
```bash
python delete_user.py user@example.com --confirm
```

---

## Step 4: Test the Pre-Signup Lambda

### Test Locally

```bash
cd backend/auth_billing
python pre_signup_lambda.py test
```

### Test in AWS

1. Try to sign up with an email that already exists
2. You should see error: "An account with email X already exists"
3. Try to sign up with a new email
4. Signup should proceed normally

---

## User Deletion Strategy

### Do You Need Cascading Deletes?

**Short Answer: Usually No** ✅

**Why**:
- Most apps use **soft deletes** (mark as deleted, don't actually delete)
- Hard deletes are risky (can't recover data)
- GDPR/legal requirements may require keeping some data

**When You Might Need It**:
- User requests account deletion (GDPR right to be forgotten)
- Compliance requirements
- Cleanup of test accounts

### Current Behavior

**Currently**: Deleting from one database does NOT delete from others.

**Example**:
- Delete from Cognito → User can't sign in, but data remains in DynamoDB/Stripe
- Delete from DynamoDB → User can sign in, but profile is gone
- Delete from Stripe → User can sign in, but subscription data is gone

### Recommended Approach

**Option 1: Soft Delete (Recommended)** ✅
- Add `deletedAt` field to UserProfiles
- Mark user as deleted instead of actually deleting
- Filter out deleted users in queries
- Keep data for compliance/analytics

**Option 2: Hard Delete Function (Use Sparingly)**
- Use the provided `delete_user.py` script
- Only for GDPR requests or test accounts
- Always backup first

**Option 3: No Automatic Deletion**
- Let users keep their accounts
- Only delete if explicitly requested
- Most common approach for SaaS apps

---

## Implementation Checklist

- [ ] Create EmailIndex GSI on UserProfiles table
- [ ] Deploy Pre-Signup Lambda function
- [ ] Add DynamoDB permissions to Lambda role
- [ ] Attach Lambda to Cognito User Pool
- [ ] Test with duplicate email (should block)
- [ ] Test with new email (should allow)
- [ ] (Optional) Review existing duplicates
- [ ] (Optional) Clean up existing duplicates

---

## Troubleshooting

### Error: "EmailIndex not found"

**Solution**: Create the EmailIndex GSI (see Step 1)

### Error: "AccessDeniedException" when Lambda runs

**Solution**: Add DynamoDB query permissions to Lambda role

### Lambda not triggering

**Solution**: 
1. Check Lambda is attached to User Pool
2. Check Lambda logs in CloudWatch
3. Verify Lambda has correct handler name

### Still allowing duplicates

**Solution**:
1. Check Lambda logs for errors
2. Verify EmailIndex exists and is queryable
3. Check email normalization (lowercase)

---

## Summary

✅ **Pre-Signup Lambda**: Prevents new duplicates going forward  
✅ **Existing Duplicates**: Can leave them or clean up manually  
✅ **User Deletion**: Not needed for most use cases, but script provided if needed

**Next Steps**:
1. Create EmailIndex GSI
2. Deploy Pre-Signup Lambda
3. Test duplicate prevention
4. (Optional) Review existing duplicates

