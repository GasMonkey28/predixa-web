# Quick Start: Migrate to DynamoDB for User Profiles

You're experiencing permission issues when users try to edit their profiles. This migration will fix that permanently.

## What Changed?

✅ **Before**: Profiles stored in Cognito → Permission issues
✅ **After**: Profiles in DynamoDB → No permission issues, works with all auth providers

## Setup (15 minutes)

### Step 1: Install Dependencies

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### Step 2: Create DynamoDB Table

#### Quick Setup via AWS Console:
1. Go to [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Click **"Create table"**
3. Fill in:
   - **Table name**: `UserProfiles`
   - **Partition key**: `userId` (String)
   - **Settings**: Use default or "On-demand"
4. Click **"Create table"**

### Step 3: Set Environment Variables

Add to your `.env.local`:

```bash
# DynamoDB
USER_PROFILE_TABLE_NAME=UserProfiles

# AWS Credentials (for API routes)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

**Note**: For production, use IAM roles instead of access keys.

### Step 4: Update IAM Permissions

Your app needs to read/write DynamoDB. Add this IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/UserProfiles"
    }
  ]
}
```

See `DYNAMODB_SETUP.md` for detailed IAM setup.

### Step 5: Migrate Existing Users (Optional)

If you have existing users in Cognito:

```bash
npx ts-node scripts/sync-profiles.ts
```

This copies existing users from Cognito to DynamoDB.

### Step 6: Test Locally

```bash
npm run dev
```

1. Sign in to your app
2. Go to Account page
3. Edit your name → Should work! ✨

### Step 7: Deploy

```bash
npm run build
npm run start
```

---

## What Was Added?

### New Files:
- `src/lib/user-profile-service.ts` - Handles all profile operations
- `DYNAMODB_SETUP.md` - Detailed setup guide
- `ARCHITECTURE_RECOMMENDATION.md` - Why we chose this approach
- `scripts/sync-profiles.ts` - Migration script
- `QUICK_START_DYNAMODB.md` - This file

### Modified Files:
- `src/lib/auth-store.ts` - Now uses DynamoDB instead of Cognito attributes
- `package.json` - Added DynamoDB SDK

---

## How It Works Now

**Old Flow** (had permission issues):
```
User edits profile → Tries to update Cognito → ❌ Permission denied
```

**New Flow** (no issues):
```
User edits profile → Updates DynamoDB → ✅ Works perfectly
```

---

## Benefits

✅ **No more permission errors**  
✅ **Works with email, Google, and Apple sign-in**  
✅ **Easy to add custom fields**  
✅ **Fast (millisecond latency)**  
✅ **Scalable to millions of users**  
✅ **Cost-effective (~$0.01/month per 10k users)**  

---

## Troubleshooting

### Issue: "Table not found"
→ Create the DynamoDB table (Step 2)

### Issue: "Access denied"
→ Check IAM permissions (Step 4)

### Issue: "Module not found"
→ Run `npm install` (Step 1)

### Issue: Users see old name
→ Sign out and back in to refresh

---

## Next Steps

1. Test the profile edit feature
2. Add more fields to profiles (e.g., preferences, settings)
3. Use this pattern for other user data

Questions? Check the detailed guides in `ARCHITECTURE_RECOMMENDATION.md` and `DYNAMODB_SETUP.md`



