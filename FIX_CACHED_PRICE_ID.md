# 🔧 Fix: Cached Price ID Issue

## 🔍 The Problem

The error shows:
```
No such price: 'price_1SLR4cCqoRregBRsF7uBCniS'
```

But your Vercel environment variables have:
- `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` = `price_1SLQgtCqoRregBRsdbbEzxQn`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` = `price_1SLQhfCqoRregBRsIxJqNfSN`

**These are different!** The error is showing an **old/cached price ID** that's not in your current environment variables.

## 🎯 Possible Causes

1. **Browser Cache**: Your browser might be using cached JavaScript with old price IDs
2. **Build Cache**: Vercel might have cached an old build
3. **Environment Variables Not Loaded**: The new environment variables might not be loaded in the current deployment

## ✅ Solution Steps

### Step 1: Verify Environment Variables in Vercel

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Verify these are set correctly:
   - `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` = `price_1SLQgtCqoRregBRsdbbEzxQn`
   - `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` = `price_1SLQhfCqoRregBRsIxJqNfSN`
3. Make sure they're set for **Production** environment (or "All Environments")

### Step 2: Clear Build Cache and Redeploy

1. Go to Vercel → Your Project → **Deployments**
2. Click on your latest deployment
3. Click **"Redeploy"** 
4. **Important**: Check the box that says **"Use existing Build Cache"** and **UNCHECK it** (to force a fresh build)
5. Click **"Redeploy"**

This will:
- Clear the build cache
- Rebuild with fresh environment variables
- Ensure the new price IDs are used

### Step 3: Clear Browser Cache

1. **Hard refresh** your browser:
   - **Chrome/Edge**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - **Firefox**: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
   - **Safari**: `Cmd + Option + R`

2. Or **clear browser cache**:
   - Open browser settings
   - Clear browsing data
   - Select "Cached images and files"
   - Clear data

### Step 4: Verify the Fix

1. After redeploying, wait for the deployment to complete
2. Hard refresh your browser
3. Go to your account page
4. Open browser **Developer Tools** (F12)
5. Go to **Console** tab
6. Check if there are any errors
7. Try clicking "Subscribe" - it should use the correct price IDs

## 🔍 Debug: Check What Price ID is Being Used

To verify which price ID is actually being used:

1. Open browser **Developer Tools** (F12)
2. Go to **Network** tab
3. Click "Subscribe" on a plan
4. Look for the request to `/api/stripe/create-checkout-session`
5. Click on it
6. Go to **Payload** or **Request** tab
7. Check the `priceId` value in the request body
8. It should match your Vercel environment variables

If it shows `price_1SLR4cCqoRregBRsF7uBCniS` (the old one), then:
- The environment variables aren't being loaded
- Or the build is using cached values

## 🆘 If It Still Doesn't Work

### Option 1: Delete and Re-add Environment Variables

1. In Vercel → Environment Variables
2. **Delete** `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY`
3. **Delete** `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY`
4. **Add them again** with the correct values
5. Redeploy (without cache)

### Option 2: Check for Multiple Environment Variable Sets

1. In Vercel → Environment Variables
2. Check the **"Environment"** dropdown
3. Make sure the variables are set for **Production** (or the environment you're deploying to)
4. If you have separate Preview/Development environments, update those too

### Option 3: Check Local .env.local File

If you're testing locally:

1. Check your `.env.local` file (if it exists)
2. Make sure it has the correct price IDs:
   ```
   NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_1SLQgtCqoRregBRsdbbEzxQn
   NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_1SLQhfCqoRregBRsIxJqNfSN
   ```
3. Restart your local development server

## 📝 Important Notes

- **Environment variables starting with `NEXT_PUBLIC_`** are embedded into the JavaScript bundle at build time
- If you change them, you **must rebuild** for the changes to take effect
- **Browser cache** can serve old JavaScript files with old price IDs
- Always **hard refresh** after redeploying

## ✅ Quick Checklist

- [ ] Verified environment variables in Vercel are correct
- [ ] Redeployed with **build cache disabled**
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Checked Network tab to verify correct price ID is being sent
- [ ] Tested subscription flow - should work now!

---

The price ID `price_1SLR4cCqoRregBRsF7uBCniS` is an old/cached value. After clearing cache and redeploying, it should use the correct price IDs from your environment variables.

