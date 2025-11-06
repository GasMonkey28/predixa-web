# 🔍 How to Find Your Stripe Price IDs

## ⚠️ Important: Product ID vs Price ID

You provided:
- **Product IDs**: `prod_TI0idKZNJXIn2k` and `prod_TI0jVa5weoNVIP`
- **We need**: **Price IDs** (start with `price_`)

Each product can have multiple prices (e.g., monthly, yearly, different currencies). We need the specific **Price ID** for each subscription plan.

---

## 📋 Step-by-Step: Find Your Price IDs

### Step 1: Go to Stripe Dashboard
1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. **Make sure you're in LIVE MODE** (toggle in top right should say "Live", not "Test")

### Step 2: Find Monthly Pro Price ID
1. Click **"Products"** in the left sidebar
2. Click on **"Monthly Pro"** (or the product with ID `prod_TI0idKZNJXIn2k`)
3. You'll see a section called **"Pricing"** or **"Prices"**
4. Look for the price that says **"$19.99 / month"** (or your monthly price)
5. You'll see a **Price ID** next to it - it starts with `price_`
6. **Copy that Price ID** (e.g., `price_1ABC123...`)

### Step 3: Find Yearly Pro Price ID
1. Still in Products, click on **"Yearly Pro"** (or the product with ID `prod_TI0jVa5weoNVIP`)
2. Look for the price that says **"$179.99 / year"** (or your yearly price)
3. **Copy that Price ID** (e.g., `price_1XYZ789...`)

---

## ✅ Yes, You Need to Add Them to Vercel!

After you have the Price IDs, add them to Vercel:

### Step 1: Go to Vercel
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project

### Step 2: Add Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Click **"Add New"** or **"Add"**
3. Add these two variables:

   **Variable 1:**
   - **Key**: `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY`
   - **Value**: `price_XXXXX` (paste your monthly price ID here)
   - **Environment**: Select **Production** (or "All Environments")
   - Click **Save**

   **Variable 2:**
   - **Key**: `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY`
   - **Value**: `price_XXXXX` (paste your yearly price ID here)
   - **Environment**: Select **Production** (or "All Environments")
   - Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click **"Redeploy"** on your latest deployment
3. Or push a new commit to trigger automatic deployment

---

## 🎯 Quick Visual Guide

In Stripe Dashboard, when you click on a product, you'll see something like:

```
Product: Monthly Pro
Product ID: prod_TI0idKZNJXIn2k

Pricing:
┌─────────────────────────────────────┐
│ $19.99 / month                       │
│ Price ID: price_1ABC123DEF456GHI     │ ← Copy THIS!
│ Status: Active                       │
└─────────────────────────────────────┘
```

**You need the Price ID, not the Product ID!**

---

## ✅ Checklist

- [ ] Opened Stripe Dashboard in **Live Mode**
- [ ] Found Monthly Pro product
- [ ] Copied Monthly Pro **Price ID** (starts with `price_`)
- [ ] Found Yearly Pro product
- [ ] Copied Yearly Pro **Price ID** (starts with `price_`)
- [ ] Added `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` to Vercel
- [ ] Added `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` to Vercel
- [ ] Redeployed the application
- [ ] Tested subscription flow

---

## 🆘 Can't Find the Price ID?

If you don't see a price listed:
1. You may need to **create a price** for the product
2. In Stripe Dashboard → Products → Click your product
3. Click **"Add price"** or **"Create price"**
4. Set the amount and billing interval
5. Save it - the Price ID will be shown

---

## 💡 Pro Tip

Price IDs look like: `price_1ABC123DEF456GHI789JKL`
- Always start with `price_`
- Are about 20-30 characters long
- Are different in Test vs Live mode

Product IDs look like: `prod_TI0idKZNJXIn2k`
- Always start with `prod_`
- Are shorter (about 15-20 characters)

**We need Price IDs, not Product IDs!**

