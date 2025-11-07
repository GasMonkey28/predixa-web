# Add Pre-Authentication Trigger for Google OAuth

## Why This is Needed

**Post-Confirmation trigger** only fires for:
- ✅ Email/password signups (after email confirmation)

**Pre-Authentication trigger** fires for:
- ✅ Email/password signups
- ✅ Google OAuth signups (first time and subsequent logins)
- ✅ Apple OAuth signups
- ✅ Every login (ensures DynamoDB records exist)

## Solution: Add Pre-Authentication Trigger

You can use the **same Lambda function** (`predixa-post-confirmation`) for both triggers because it's **idempotent** (safe to run multiple times).

## Steps to Add Pre-Authentication Trigger

### Step 1: Go to Cognito Console

1. **AWS Console** → **Cognito** → Your User Pool (`us-east-1_g5anv7`)
2. **Authentication** tab (left sidebar)
3. **Extensions** section
4. **Lambda triggers**

### Step 2: Configure Pre-Authentication

1. Find **"Pre-authentication"** in the list
2. Click the dropdown (currently shows "None" or empty)
3. Select **`predixa-post-confirmation`**
4. Click **Save changes**

### Step 3: Verify

You should see:
- ✅ **Post confirmation**: `predixa-post-confirmation`
- ✅ **Pre-authentication**: `predixa-post-confirmation`

## What Happens Now

### Email/Password Signups:
1. User signs up → Post-Confirmation fires → Creates DynamoDB records ✅
2. User logs in later → Pre-Authentication fires → Ensures records exist ✅

### Google OAuth Signups:
1. User signs in with Google (first time) → Pre-Authentication fires → Creates DynamoDB records ✅
2. User signs in with Google (subsequent) → Pre-Authentication fires → Ensures records exist ✅

## Test It

1. **Sign out** completely from your app
2. **Sign in with Google** again
3. **Check CloudWatch Logs**:
   - Lambda → `predixa-post-confirmation` → **Monitor** → **View CloudWatch logs**
   - Should see logs from Pre-Authentication trigger
4. **Check DynamoDB**:
   - `UserProfiles` table → Should have your user
   - `predixa_entitlements` table → Should have record with `status="none"`

## Why This Works

The Lambda function is **idempotent**:
- ✅ If user exists in DynamoDB → Updates (no duplicate)
- ✅ If user doesn't exist → Creates new record
- ✅ Safe to run on every login

---

**Add the Pre-Authentication trigger now, then sign in with Google again to test!** 🚀

