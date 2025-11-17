# Fix Production IAM Permissions

## The Problem

Your production IAM user (`predixa-webhook-user`) doesn't have DynamoDB permissions.

**Error:**
```
User: arn:aws:iam::822233328169:user/predixa-webhook-user 
is not authorized to perform: dynamodb:GetItem
```

---

## Solution: Add DynamoDB Permissions

### Option 1: AWS Console (Easiest)

1. Go to: https://console.aws.amazon.com/iam/
2. Click **Users** in left sidebar
3. Find user: `predixa-webhook-user`
4. Click the **"Permissions"** tab
5. Click **"Add permissions"**
6. Click **"Attach policies directly"**
7. Search for: `AmazonDynamoDBFullAccess`
8. Check the box next to it
9. Click **"Next"** → **"Add permissions"**

---

### Option 2: AWS CLI

Run this command:

```bash
aws iam attach-user-policy \
  --user-name predixa-webhook-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

---

## After Adding Permissions

1. Wait 30-60 seconds for permissions to propagate
2. Test on production site (`predixasweb.com`)
3. Try editing profile as Google/Apple user
4. Should work now! ✅

---

## What This Does

Gives the IAM user full DynamoDB access so Vercel can read/write to the `UserProfiles` table.

⚠️ **Security Note:** This gives full DynamoDB access. For production, consider creating a custom policy with limited permissions later.


















