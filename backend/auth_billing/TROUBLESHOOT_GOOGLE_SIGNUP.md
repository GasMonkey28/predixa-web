# Troubleshooting: Google OAuth Signup Not Triggering Post-Confirmation

## The Problem

When users sign up with **Google OAuth**, the Post-Confirmation trigger may **not fire** because:

1. **Federated users are already "confirmed"** by Google
2. Cognito treats OAuth signups differently than email/password signups
3. The Post-Confirmation trigger is primarily for email/password signups

## Solution: Use Pre-Authentication Trigger Instead

For **federated identity providers** (Google, Apple), we should use the **Pre-Authentication** trigger, which fires **every time** a user signs in (including first-time signups).

### Step 1: Check if User Already Exists in DynamoDB

First, let's verify if the Google user was created in Cognito:

1. **Go to Cognito Console** → Your User Pool
2. **Users** tab → Search for the email you used
3. **Check if the user exists**

If the user exists in Cognito but not in DynamoDB, we need to handle this.

### Step 2: Add Pre-Authentication Trigger

The Pre-Authentication trigger fires **every time** a user authenticates (including OAuth), so it's perfect for ensuring DynamoDB records exist.

**Option A: Create a New Lambda Function (Recommended)**

1. **Create new Lambda**: `predixa-pre-authentication`
2. **Use the same code** as Post-Confirmation (it's idempotent - safe to run multiple times)
3. **Configure trigger** in Cognito → **Authentication** → **Extensions** → **Pre-authentication**

**Option B: Reuse Post-Confirmation Lambda**

You can configure the **same Lambda function** (`predixa-post-confirmation`) for **both** triggers:
- Post-Confirmation (for email/password signups)
- Pre-Authentication (for OAuth signups)

## Quick Fix: Configure Pre-Authentication Trigger

### Via Cognito Console:

1. **Go to Cognito Console** → Your User Pool
2. **Authentication** → **Extensions** → **Lambda triggers**
3. **Pre-authentication** → Select `predixa-post-confirmation`
4. **Save**

### What This Does:

- **Email/Password Signups**: Post-Confirmation trigger fires → Creates DynamoDB record
- **Google OAuth Signups**: Pre-Authentication trigger fires → Creates DynamoDB record
- **Subsequent Logins**: Pre-Authentication fires → Ensures record exists (idempotent)

## Verify It Works

1. **Sign out** completely
2. **Sign in with Google** again
3. **Check CloudWatch Logs** for `predixa-post-confirmation`:
   - Should see logs from Pre-Authentication trigger
4. **Check DynamoDB**:
   - `UserProfiles` table → Should have your user
   - `predixa_entitlements` table → Should have record with `status="none"`

## Alternative: Manual Fix for Existing Users

If you already signed up with Google and the record wasn't created:

### Option 1: Re-run the Lambda Manually

1. **Go to Lambda** → `predixa-post-confirmation`
2. **Test** tab → Create test event with this structure:

```json
{
  "version": "1",
  "region": "us-east-1",
  "userPoolId": "us-east-1_g5anv7",
  "userName": "Google_1234567890",
  "triggerSource": "PreAuthentication_ExternalProvider",
  "request": {
    "userAttributes": {
      "sub": "your-cognito-sub-id",
      "email": "your-email@gmail.com",
      "email_verified": "true",
      "given_name": "Your",
      "family_name": "Name"
    }
  },
  "response": {}
}
```

3. **Run test** - This will create the DynamoDB records

### Option 2: Check DynamoDB First

Before adding Pre-Authentication trigger, check if the user record exists:

1. **Go to DynamoDB Console**
2. **UserProfiles** table → Search for your email or Cognito sub
3. If it exists, the trigger might have worked but logs weren't visible
4. If it doesn't exist, add Pre-Authentication trigger

## Recommended Solution

**Add Pre-Authentication trigger** to `predixa-post-confirmation` Lambda:

1. ✅ Works for both email/password and OAuth signups
2. ✅ Ensures records exist on every login
3. ✅ Idempotent (safe to run multiple times)
4. ✅ No code changes needed

---

**Next Step**: Configure Pre-Authentication trigger in Cognito, then sign in with Google again to test!

