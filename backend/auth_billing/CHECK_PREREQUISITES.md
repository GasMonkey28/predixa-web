# Prerequisites Checklist

Let's check what you already have and what you need to create.

## ✅ What You Likely Already Have

### 1. AWS Account ✅
Based on your codebase, you have:
- **AWS Account ID**: `822233328169` (from IAM_SETUP_REQUIRED.md)
- **Region**: `us-east-1`
- **Cognito User Pool**: Already configured (used for authentication)

**How to verify:**
- Go to [AWS Console](https://console.aws.amazon.com/)
- You should be able to log in

### 2. DynamoDB Table: UserProfiles ✅ (Probably)
Your codebase shows this table is being used:
- Referenced in `src/app/api/user/profile/route.ts`
- Setup docs exist (`DYNAMODB_SETUP.md`, `SETUP_COMPLETE.md`)

**How to verify:**
1. Go to [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Check if table `UserProfiles` exists
3. If it exists → ✅ You're good!
4. If it doesn't exist → Create it (see below)

### 3. Stripe API Keys ✅
Your codebase shows Stripe is configured:
- `STRIPE_SECRET_KEY` referenced throughout
- Using live mode keys (`sk_live_...`)

**How to verify:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables
2. Check if `STRIPE_SECRET_KEY` exists
3. If it exists → ✅ You're good!
4. If it doesn't exist → Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

## ❌ What You Need to Create

### 1. DynamoDB Table: predixa_entitlements ❌
This is a NEW table for subscription status.

**Create it now:**

#### Option A: AWS Console (Easiest)
1. Go to [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Click **"Create table"**
3. Fill in:
   - **Table name**: `predixa_entitlements`
   - **Partition key**: `cognito_sub` (String)
   - **Table settings**: Use default or "On-demand"
4. Click **"Create table"**
5. Wait for status to be "Active" (takes ~30 seconds)

#### Option B: AWS CLI
```bash
aws dynamodb create-table \
  --table-name predixa_entitlements \
  --attribute-definitions AttributeName=cognito_sub,AttributeType=S \
  --key-schema AttributeName=cognito_sub,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Stripe Webhook Secret ❌
You'll get this AFTER creating the webhook endpoint in Stripe.

**For now:** You can deploy without it, then add it later.

## Quick Verification Script

Run these checks:

### Check 1: DynamoDB Tables
```bash
# If you have AWS CLI configured:
aws dynamodb list-tables --region us-east-1

# Should show:
# - UserProfiles (if created)
# - predixa_entitlements (need to create)
```

### Check 2: Stripe Keys
```bash
# Check Vercel environment variables
# Or check your .env.local file for:
# STRIPE_SECRET_KEY=sk_live_...
```

### Check 3: AWS Account Access
```bash
# If you have AWS CLI:
aws sts get-caller-identity

# Should return your account ID and user ARN
```

## What to Do Next

### If You Have Everything ✅
1. ✅ AWS Account → Ready
2. ✅ UserProfiles table → Ready
3. ✅ Stripe API keys → Ready
4. ❌ **Create `predixa_entitlements` table** (5 minutes)
5. ❌ **Deploy Lambda functions** (follow `DEPLOY_VIA_CONSOLE.md`)

### If You're Missing Something

**Missing UserProfiles table:**
- Follow `DYNAMODB_SETUP.md` → Step 1
- Takes 2 minutes

**Missing Stripe keys:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret key** (starts with `sk_live_...`)
3. Add to Vercel: Settings → Environment Variables → `STRIPE_SECRET_KEY`

**Missing AWS account:**
- Sign up at [aws.amazon.com](https://aws.amazon.com)
- Free tier available (12 months free)

## Summary

| Prerequisite | Status | Action Needed |
|-------------|--------|---------------|
| AWS Account | ✅ Likely have | Verify login |
| UserProfiles table | ✅ Probably have | Verify in DynamoDB console |
| predixa_entitlements table | ❌ Need to create | Create now (5 min) |
| Stripe API keys | ✅ Likely have | Verify in Vercel |
| Stripe Webhook Secret | ❌ Get later | After webhook setup |

## Next Step

**Most likely you just need to:**
1. ✅ Verify UserProfiles table exists
2. ❌ **Create `predixa_entitlements` table** (see above)
3. ✅ Verify Stripe keys in Vercel
4. 🚀 **Start deploying Lambda functions** (follow `DEPLOY_VIA_CONSOLE.md`)

---

**Quick Test:** Can you access [AWS DynamoDB Console](https://console.aws.amazon.com/dynamodb/)? If yes, you're ready to proceed! 🎉

