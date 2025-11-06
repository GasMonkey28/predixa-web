# 🔄 Update to Live Mode Price IDs

## ⚠️ The Problem

You currently have **test mode** price IDs in Vercel:
- `price_1SLQhfCqoRregBRsIxJqNfSN` (Yearly - TEST MODE)
- `price_1SLQgtCqoRregBRsdbbEzxQn` (Monthly - TEST MODE)

But you're using **live mode** Stripe keys (`sk_live_...` and `pk_live_...`).

**Test and live mode price IDs are completely different!** You need to find the **live mode** price IDs for the same products.

---

## ✅ Solution: Get Live Mode Price IDs

### Step 1: Switch to Live Mode in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Toggle to LIVE MODE** (top right corner)
   - It should say **"Live"** (not "Test")
   - The toggle should be on the right side

### Step 2: Find Monthly Pro Live Price ID

1. Click **"Products"** in the left sidebar
2. Click on **"Monthly Pro"** (the product with ID `prod_TI0idKZNJXIn2k`)
3. Scroll down to the **"Pricing"** section
4. You'll see a price like **"$19.99 USD / month"**
5. Next to it, you'll see a **Price ID** that starts with `price_`
6. **Copy that Price ID** - this is your LIVE MODE price ID
   - Example: `price_1ABC123...` (different from test mode!)

### Step 3: Find Yearly Pro Live Price ID

1. Still in Products, click on **"Yearly Pro"** (the product with ID `prod_TI0jVa5weoNVIP`)
2. Scroll down to the **"Pricing"** section
3. You'll see a price like **"$179.99 USD / year"**
4. **Copy that Price ID** - this is your LIVE MODE price ID

### Step 4: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY`
5. Click the **three dots** (⋯) → **Edit**
6. Replace the value with your **LIVE MODE** monthly price ID
7. Click **Save**
8. Repeat for `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` with your **LIVE MODE** yearly price ID

### Step 5: Redeploy

1. Go to **Deployments** tab
2. Click **"Redeploy"** on your latest deployment
3. Or push a new commit to trigger automatic deployment

---

## 🎯 Quick Checklist

- [ ] Switched Stripe Dashboard to **Live Mode**
- [ ] Found Monthly Pro **LIVE** price ID (starts with `price_`)
- [ ] Found Yearly Pro **LIVE** price ID (starts with `price_`)
- [ ] Updated `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` in Vercel with LIVE price ID
- [ ] Updated `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` in Vercel with LIVE price ID
- [ ] Redeployed the application
- [ ] Tested subscription flow - buttons should now work!

---

## 📝 Important Notes

### Products vs Prices

- **Products** are the same in test and live mode (same product IDs)
- **Prices** are DIFFERENT in test and live mode (different price IDs)
- You don't need to create new products - they already exist!
- You just need to find the LIVE MODE price IDs for existing products

### How to Tell Test vs Live Price IDs

You can't tell from the price ID itself - you need to check:
- **Test mode**: Price IDs created when Stripe Dashboard is in "Test" mode
- **Live mode**: Price IDs created when Stripe Dashboard is in "Live" mode

The price IDs you currently have (`price_1SLQhf...` and `price_1SLQgt...`) were created in test mode, which is why they don't work with live keys.

---

## 🔍 What You'll See in Stripe

When you click on a product in **Live Mode**, you'll see:

```
Product: Monthly Pro
Product ID: prod_TI0idKZNJXIn2k

Pricing:
┌─────────────────────────────────────┐
│ $19.99 USD / month                  │
│ Price ID: price_1LIVE123...         │ ← Copy THIS (LIVE MODE)
│ Status: Active                      │
└─────────────────────────────────────┘
```

The Price ID will be **different** from what you see in test mode!

---

## ✅ After Updating

Once you update the environment variables and redeploy:
- The warning message will disappear
- The "Subscribe" buttons will be enabled
- Subscriptions will work with your live Stripe account

---

## 🆘 If You Don't See Prices in Live Mode

If you don't see any prices when you click on the product in Live Mode:

1. You may need to **create a price** for the product in Live Mode
2. Click **"Add price"** or **"Create price"** on the product page
3. Set:
   - Amount: $19.99 (for monthly) or $179.99 (for yearly)
   - Billing period: Monthly or Yearly
4. Save it - the Price ID will be shown
5. Copy that Price ID and add it to Vercel

---

## 💡 Pro Tip

To avoid confusion in the future:
- Keep a note of which price IDs are for test mode
- Keep a note of which price IDs are for live mode
- Or use different environment variable sets for test vs production in Vercel

