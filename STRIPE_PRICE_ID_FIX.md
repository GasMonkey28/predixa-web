# 🔧 Fix: Stripe Price ID Mismatch (Test vs Live Mode)

## Problem

You're getting this error:
```
No such price: 'price_1SLR4cCqoRregBRsF7uBCniS'; a similar object exists in test mode, but a live mode key was used to make this request.
```

This happens because:
- ✅ You're using a **live mode** Stripe secret key (`sk_live_...`)
- ❌ But the code has **test mode** price IDs hardcoded

**Stripe price IDs are different between test and live modes!**

---

## ✅ Solution

I've updated the code to use environment variables for price IDs. Now you need to:

### Step 1: Get Your Live Mode Price IDs

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Toggle to Live Mode** (top right corner - make sure it says "Live" not "Test")
3. Navigate to **Products** → Select your product
4. Find the **Price ID** (starts with `price_`)
5. Copy both:
   - Monthly subscription price ID
   - Yearly subscription price ID

### Step 2: Add Environment Variables to Vercel

1. Go to your **Vercel Dashboard** → Your Project
2. Navigate to **Settings** → **Environment Variables**
3. Add these two new variables:

   ```
   NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_XXXXXXXXXXXXX
   NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_XXXXXXXXXXXXX
   ```

   Replace `price_XXXXXXXXXXXXX` with your actual live mode price IDs.

4. Set scope to **Production** (or "All Environments" if you want it everywhere)
5. Click **Save**

### Step 3: Redeploy

After adding the environment variables:
1. Go to **Deployments** tab in Vercel
2. Click **Redeploy** on your latest deployment
3. Or push a new commit to trigger a deployment

---

## 📋 Quick Checklist

- [ ] Toggled Stripe Dashboard to **Live Mode**
- [ ] Found Monthly subscription price ID in Stripe
- [ ] Found Yearly subscription price ID in Stripe
- [ ] Added `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` to Vercel
- [ ] Added `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` to Vercel
- [ ] Redeployed the application
- [ ] Tested subscription flow

---

## 🔍 How to Verify It's Working

1. After redeploying, go to your account page
2. You should see the subscription plans (no warning message)
3. Click "Subscribe" on a plan
4. It should redirect to Stripe checkout without errors

---

## 🧪 For Local Development

If you want to test locally, add these to your `.env.local` file:

```bash
# Use test mode price IDs for local development
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_1SLR4cCqoRregBRsF7uBCniS
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_1SLR4cCqoRregBRsibd2Jz0B
```

**Note:** These are test mode price IDs. Make sure you're also using test mode Stripe keys (`sk_test_...` and `pk_test_...`) in your local `.env.local` file.

---

## 📝 What Changed in the Code

1. **Created `src/lib/stripe-config.ts`**: Centralized configuration for Stripe price IDs
2. **Updated `src/app/account/page.tsx`**: Now uses environment variables instead of hardcoded price IDs
3. **Added validation**: Shows warning if price IDs aren't configured

---

## ⚠️ Important Notes

- **Test and Live price IDs are different** - You must use the correct ones for each mode
- **Environment variables must start with `NEXT_PUBLIC_`** - This makes them available in the browser
- **Redeploy after adding variables** - Vercel needs to rebuild to pick up new environment variables
- **Keep test keys for development** - Use test mode in local development, live mode in production

---

## 🆘 Still Having Issues?

1. **Check Vercel logs**: Look for errors in the deployment logs
2. **Verify environment variables**: Make sure they're set correctly in Vercel
3. **Check Stripe Dashboard**: Ensure you're looking at Live Mode price IDs
4. **Verify Stripe keys**: Make sure `STRIPE_SECRET_KEY` starts with `sk_live_` (not `sk_test_`)

---

## 💡 Pro Tip

You can verify your Stripe mode by checking the publishable key:
- `pk_live_...` = Live mode
- `pk_test_...` = Test mode

Make sure your keys and price IDs match the same mode!

