# 🔧 Fix Local Authentication Issue

## Problem
Authentication works on production (web) but fails locally with "NotAuthorizedException: Incorrect username or password."

## Root Cause
Your local environment is missing or has incorrect Cognito environment variables. Production (Vercel) has the correct values, but local doesn't.

## Solution

### Step 1: Check Debug Logs
After restarting your dev server, check the browser console. You'll see debug logs like:
```
🔍 Amplify Config Debug: {
  userPoolId: "✅ Set" or "❌ Missing",
  clientId: "✅ Set" or "❌ Missing",
  ...
}
```

This will show you what's missing.

### Step 2: Get Values from Vercel (Recommended)

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project: `predixa-web` (or similar)

2. **Copy Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Copy these values:
     - `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
     - `NEXT_PUBLIC_COGNITO_CLIENT_ID`
     - `NEXT_PUBLIC_AWS_REGION`
     - `NEXT_PUBLIC_COGNITO_DOMAIN` (for OAuth)

### Step 3: Create/Update `.env.local`

Create a `.env.local` file in your project root (same directory as `package.json`):

```bash
# AWS Cognito - REQUIRED for authentication
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com

# Optional (for DynamoDB/OAuth users)
NEXT_PUBLIC_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Important:** Replace the placeholder values with the actual values from Vercel!

### Step 4: Restart Dev Server

```bash
# Stop your current dev server (Ctrl+C)
npm run dev
```

### Step 5: Test Again

1. Open browser console (F12)
2. Try signing in with your email/password
3. Check the debug logs to confirm all variables are set
4. If still failing, check the error details in console

---

## Alternative: Get Values from AWS Console

If you can't access Vercel, get them from AWS:

1. **Go to AWS Cognito Console**
   - https://console.aws.amazon.com/cognito/
   - Select **User pools**
   - Click on your User Pool (ID starts with `g5anv7` or similar)

2. **Get User Pool ID**
   - Found at the top of the User Pool page
   - Format: `us-east-1_XXXXXXXXX`

3. **Get Client ID**
   - Go to **App integration** tab
   - Scroll to **App clients and analytics**
   - Click on your app client
   - Copy the **Client ID**

4. **Get Region**
   - Usually `us-east-1` (shown in the URL or User Pool ID)

5. **Get Cognito Domain**
   - Go to **App integration** tab
   - Under **Domain** section
   - Copy the domain (format: `your-domain.auth.us-east-1.amazoncognito.com`)

---

## Common Issues

### Issue: "Still getting NotAuthorizedException"
**Solution:**
- Double-check you copied the values correctly (no extra spaces)
- Make sure `.env.local` is in the project root (not in `src/` or `attractiveChart/`)
- Restart the dev server completely
- Clear browser cache/localStorage

### Issue: "Variables show as Missing in console"
**Solution:**
- Make sure file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- Make sure variables start with `NEXT_PUBLIC_`
- Restart dev server (Next.js only reads env vars on startup)

### Issue: "Works in production but not locally"
**Solution:**
- This is exactly what we're fixing! You need the same values locally.
- Production uses Vercel env vars, local uses `.env.local`

---

## Verification

After setting up, you should see in console:
```
🔍 Amplify Config Debug: {
  userPoolId: "✅ Set",
  clientId: "✅ Set",
  region: "✅ Set",
  domain: "✅ Set",
  ...
}
```

And sign-in should work! 🎉






























