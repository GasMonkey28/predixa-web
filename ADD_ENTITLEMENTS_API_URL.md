# Add Entitlements API Gateway URL to Local Environment

## The Problem

You're getting `{"error":"Entitlements API not configured"}` because the `ENTITLEMENTS_API_GATEWAY_URL` environment variable is not set in your local `.env.local` file.

## Quick Fix

### Step 1: Get Your API Gateway URL

From Step 7 in `DEPLOY_VIA_CONSOLE.md`, you should have created an API Gateway for the Entitlements API. The URL format is:

```
https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
```

**To find it:**
1. Go to **API Gateway Console** → Select `predixa-entitlements-api`
2. Click **"Stages"** → Click on `prod` stage
3. Copy the **"Invoke URL"** at the top
4. Add `/me/entitlements` to the end

**Example:**
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
```

### Step 2: Add to .env.local

1. **Create or open** `.env.local` file in your project root (same folder as `package.json`)
2. **Add this line**:
   ```bash
   ENTITLEMENTS_API_GATEWAY_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
   ```
   (Replace `YOUR_API_ID` with your actual API Gateway ID)

3. **Save the file**

### Step 3: Restart Dev Server

**Important:** Environment variables are loaded at startup, so you need to restart:

1. **Stop the dev server** (Ctrl+C in terminal)
2. **Start it again**:
   ```bash
   npm run dev
   ```

### Step 4: Test Again

1. **Sign in** to your app
2. **Go to**: `http://localhost:3000/api/entitlements`
3. **Should now return**:
   ```json
   {
     "status": "active",
     "subscriptionId": "sub_xxx",
     "stripeCustomerId": "cus_xxx"
   }
   ```

## Example .env.local File

Your `.env.local` should look something like this:

```bash
# AWS Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxx
NEXT_PUBLIC_AWS_REGION=us-east-1

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Entitlements API (NEW - Add this!)
ENTITLEMENTS_API_GATEWAY_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
```

## Troubleshooting

### Still Getting "Entitlements API not configured"

1. **Check the file name** - Must be `.env.local` (not `.env` or `.env.local.txt`)
2. **Check the location** - Must be in project root (same folder as `package.json`)
3. **Restart dev server** - Environment variables only load on startup
4. **Check for typos** - Variable name must be exactly `ENTITLEMENTS_API_GATEWAY_URL`

### Getting 401 Unauthorized

- Make sure you're **signed in** to the app
- The API requires a valid Cognito JWT token

### Getting 500 Server Error

- Check Lambda function logs in CloudWatch
- Verify API Gateway is deployed correctly
- Check Cognito Authorizer is configured

---

**Add the URL to `.env.local` and restart your dev server!** 🚀

