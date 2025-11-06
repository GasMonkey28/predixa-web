# ✅ Create Live Mode Prices (If Missing)

## 🎯 The Situation

You're in **Live Mode** (test toggle is OFF), but the price ID you see (`price_1SLQgtCqoRregBRsdbbEzxQn`) might be from test mode, or the price might not exist in Live Mode.

## 🔍 How to Check

### Step 1: Look at the Pricing Section

On the product page you're viewing, scroll down to the **"Pricing"** section. You should see:

```
Pricing
┌─────────────────────────────────────────┐
│ $19.99 USD Per month                     │
│ Price ID: price_XXXXX...                │ ← This is what you need!
│ Description: Default                     │
│ Subscriptions: 0 active                  │
│ Created: [date]                          │
└─────────────────────────────────────────┘
```

### Step 2: What to Do Based on What You See

#### ✅ If You See a Price Listed:
- **Copy the Price ID** shown in that section
- That's your **LIVE MODE** price ID
- Update Vercel with this price ID

#### ❌ If You See "No prices" or Empty Pricing Section:
- You need to **create a price** in Live Mode
- Follow the steps below

---

## 🛠️ How to Create a Price in Live Mode

### For Monthly Pro:

1. On the product page, look for a button that says:
   - **"Add price"** OR
   - **"Create price"** OR
   - **"+ Price"**
2. Click that button
3. Fill in the form:
   - **Price**: `19.99`
   - **Currency**: `USD` (should be default)
   - **Billing period**: Select **"Monthly"** or **"Recurring monthly"**
4. Click **"Add price"** or **"Save"**
5. A new **Price ID** will be created and shown
6. **Copy this Price ID** - this is your LIVE MODE price ID
7. It will look like: `price_1ABC123...` (different from test mode!)

### For Yearly Pro:

1. Go to **Products** → Click **"Yearly Pro"**
2. Follow the same steps:
   - Click **"Add price"**
   - **Price**: `179.99`
   - **Billing period**: Select **"Yearly"** or **"Recurring yearly"**
3. Save and copy the new Price ID

---

## 📝 Important Notes

### Don't Create a New Product!

- ✅ **Products are shared** between test and live mode
- ✅ The product `prod_TI0idKZNJXln2k` already exists
- ❌ You **don't need** to create a new product
- ✅ You only need to create a **price** if one doesn't exist in Live Mode

### Why Events Section Can Be Confusing

The **Events** section shows historical events, including:
- Events from test mode (even when you're in live mode)
- Events from when you created things in test mode

**Don't rely on the Events section** - look at the actual **Pricing** section to see what prices currently exist in Live Mode.

---

## ✅ After Creating Prices

1. Copy the **LIVE MODE** price IDs (the new ones you just created)
2. Go to Vercel → Environment Variables
3. Update:
   - `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` = new monthly LIVE price ID
   - `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` = new yearly LIVE price ID
4. Redeploy

---

## 🎯 Quick Checklist

- [ ] Confirmed you're in **Live Mode** (test toggle is OFF)
- [ ] Checked **Pricing section** on Monthly Pro product
- [ ] If no price exists → Created new price in Live Mode
- [ ] Copied Monthly Pro **LIVE** price ID
- [ ] Checked **Pricing section** on Yearly Pro product
- [ ] If no price exists → Created new price in Live Mode
- [ ] Copied Yearly Pro **LIVE** price ID
- [ ] Updated Vercel environment variables with LIVE price IDs
- [ ] Redeployed application
- [ ] Tested subscription - should work now!

---

## 💡 Key Takeaway

**Products = Same in test and live**  
**Prices = Different IDs in test vs live**

You don't need new products, just make sure prices exist in Live Mode!

