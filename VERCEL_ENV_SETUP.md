# Vercel Environment Variables Setup

## Required Environment Variable

You need to add **one new environment variable** to Vercel for the entitlements integration:

### `ENTITLEMENTS_API_GATEWAY_URL`

**What it is:** The API Gateway URL for your entitlements Lambda function

**Format:** `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements`

**How to get it:**
1. After deploying the entitlements Lambda and API Gateway (see `backend/auth_billing/QUICK_DEPLOY.md`)
2. Go to AWS Console → API Gateway
3. Find your REST API (e.g., `predixa-entitlements-api`)
4. Go to **Stages** → `prod` (or your stage name)
5. Copy the **Invoke URL**
6. Append `/me/entitlements` to get the full URL

**Example:**
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
```

## How to Add in Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **Predixa project**
3. Click **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in:
   - **Name**: `ENTITLEMENTS_API_GATEWAY_URL`
   - **Value**: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements`
   - **Environment**: 
     - ✅ Production
     - ✅ Preview
     - ✅ Development
6. Click **Save**
7. **Important**: Redeploy your application for changes to take effect
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Add environment variable
vercel env add ENTITLEMENTS_API_GATEWAY_URL

# When prompted, enter the API Gateway URL
# Select environments: Production, Preview, Development

# Redeploy
vercel --prod
```

## Existing Environment Variables

You should already have these (don't change them):

```bash
# AWS Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=us-east-1

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# AWS SDK (for server-side operations)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Testing After Adding

1. **Redeploy** your Vercel application
2. **Sign in** to your app
3. **Open browser DevTools** → Network tab
4. **Navigate** to a protected route (e.g., `/daily`)
5. **Check** for a request to `/api/entitlements`
6. **Verify** the response contains subscription status

## Troubleshooting

### "Entitlements API not configured" error
- ✅ Check that `ENTITLEMENTS_API_GATEWAY_URL` is set in Vercel
- ✅ Verify you redeployed after adding the variable
- ✅ Check that the URL is correct (ends with `/me/entitlements`)

### 401 Unauthorized
- ✅ Check that your Cognito JWT is valid
- ✅ Verify API Gateway Cognito Authorizer is configured
- ✅ Check Lambda function logs in CloudWatch

### CORS errors
- ✅ Enable CORS in API Gateway for your Vercel domain
- ✅ Add your Vercel domain to API Gateway CORS settings

### Variable not updating
- ✅ Make sure you redeployed after adding/changing the variable
- ✅ Check that you selected the correct environment (Production/Preview/Development)
- ✅ Clear browser cache and try again

## Local Development

For local development, add to `.env.local`:

```bash
ENTITLEMENTS_API_GATEWAY_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
```

**Note:** Use the same API Gateway URL for local development (it will work with your local Cognito JWT).

## Security Notes

- ✅ The API Gateway URL is **public** (it's safe to expose)
- ✅ Security is handled by **Cognito Authorizer** (validates JWT)
- ✅ Only authenticated users can call the endpoint
- ✅ No secrets are exposed in this URL

---

**After adding this variable and redeploying, your subscription gating will work!** 🎉

