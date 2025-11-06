# 🔍 How to Verify You're in Live Mode & Get Live Price IDs

## ⚠️ Critical Check: Are You in Live Mode?

The price IDs you copied (`price_1SLQgtCqoRregBRsdbbEzxQn` and `price_1SLQhfCqoRregBRsIxJqNfSN`) were created on **Oct 23** - but we need to verify if they were created in **Test Mode** or **Live Mode**.

---

## Step 1: Check Stripe Dashboard Mode

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Look at the **TOP RIGHT CORNER** of the page
3. You should see a toggle that says either:
   - **"Test mode"** ← If you see this, you're in TEST mode
   - **"Live mode"** ← If you see this, you're in LIVE mode

### If You See "Test mode":
- ❌ The price IDs you copied are TEST MODE price IDs
- ✅ You need to **toggle to Live Mode** (click the toggle)
- ✅ Then find the price IDs again in Live Mode

### If You See "Live mode":
- ✅ You're in the right mode
- ✅ But the price IDs might still be from test mode if you copied them before
- ✅ Double-check by looking at when they were created

---

## Step 2: Find Live Mode Price IDs

### Option A: If Products Already Exist in Live Mode

1. Make sure you're in **Live Mode** (toggle in top right)
2. Go to **Products** → Click on **"Monthly Pro"**
3. Scroll to the **"Pricing"** section
4. Look for the price - you should see:
   - **Price ID**: `price_XXXXX...` (this will be DIFFERENT from test mode)
   - **Created date**: Should be recent or when you created it in live mode
5. **Copy this Price ID** - this is your LIVE MODE price ID
6. Repeat for **"Yearly Pro"**

### Option B: If No Prices Exist in Live Mode

If you don't see any prices when you click on the product in Live Mode:

1. You need to **create a price** in Live Mode
2. Click **"Add price"** or **"Create price"** button
3. Fill in:
   - **Amount**: $19.99 (for monthly) or $179.99 (for yearly)
   - **Billing period**: Monthly or Yearly
   - **Currency**: USD
4. Click **"Add price"** or **"Save"**
5. The new **Price ID** will be shown - copy it
6. This is your **LIVE MODE** price ID

---

## Step 3: Update Vercel

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY`
3. Click the **three dots (⋯)** → **Edit**
4. **Delete** the old value (`price_1SLQgtCqoRregBRsdbbEzxQn`)
5. **Paste** your new **LIVE MODE** monthly price ID
6. Click **Save**
7. Repeat for `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` with the **LIVE MODE** yearly price ID

---

## Step 4: Verify Your Stripe Keys Are Live Mode

While you're at it, verify your Stripe keys are also in live mode:

1. In Vercel → Environment Variables
2. Check `STRIPE_SECRET_KEY` - it should start with `sk_live_` (not `sk_test_`)
3. Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - it should start with `pk_live_` (not `pk_test_`)

If they start with `sk_test_` or `pk_test_`, you need to update them to live mode keys too!

---

## 🎯 Quick Checklist

- [ ] Opened Stripe Dashboard
- [ ] Verified toggle says **"Live mode"** (not "Test mode")
- [ ] Found Monthly Pro product in Live Mode
- [ ] Found/Created Monthly Pro **LIVE** price ID
- [ ] Found/Created Yearly Pro **LIVE** price ID
- [ ] Updated `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` in Vercel with LIVE price ID
- [ ] Updated `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` in Vercel with LIVE price ID
- [ ] Verified `STRIPE_SECRET_KEY` starts with `sk_live_`
- [ ] Verified `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_live_`
- [ ] Redeployed application
- [ ] Tested subscription - buttons should work!

---

## 🔍 How to Tell Test vs Live Price IDs

Unfortunately, you **cannot tell** from the price ID itself whether it's test or live. The only way to know is:

1. **Check which mode you were in** when you created/copied it
2. **Check the Stripe Dashboard mode** when viewing it
3. **Try using it** - if you get the error "a similar object exists in test mode, but a live mode key was used", then it's a test mode price ID

---

## 💡 Why This Happens

Stripe keeps test and live data completely separate:
- **Test mode**: For development/testing, uses test cards, no real charges
- **Live mode**: For production, real payments, real charges

When you create a product/price in test mode, it only exists in test mode. You need to either:
1. Create it again in live mode, OR
2. If it already exists in live mode, find the live mode price ID

---

## 🆘 Still Confused?

If you're not sure which mode you're in:

1. Look at the **URL** in your browser when viewing Stripe Dashboard
2. Test mode URLs often have indicators, but the most reliable way is the toggle
3. **Toggle to Live Mode** explicitly (even if you think you're already there)
4. Then find the price IDs fresh

The price IDs you currently have (`price_1SLQgt...` and `price_1SLQhf...`) are definitely test mode because:
- They were created on Oct 23
- You're getting the error about test mode
- Your Stripe keys are live mode

You **must** get the live mode price IDs to fix this!

