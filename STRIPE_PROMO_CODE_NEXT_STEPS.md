# Next Steps: After Creating Your Coupon

## ✅ You've Created the Coupon!

You can see "One Month Free" (100% off once) in your Stripe dashboard. Now you need to create the **Promotion Code** that customers will actually enter.

## Step 1: Create the Promotion Code

1. **Click on your coupon** "One Month Free" in the list
2. You'll see a section called **"Promotion codes"** or **"Codes"**
3. Click **"+ Create promotion code"** or **"Add promotion code"**
4. Fill out the form:
   - **Code**: Enter something like `FREEMONTH` or `1MONTHFREE` (all caps, no spaces)
   - **Customer eligibility**: Leave as "All customers" (unless you want restrictions)
   - **Expiration** (optional): Leave blank for no expiration, or set a date
   - **Redemption limits** (optional): Leave blank for unlimited
5. Click **"Create promotion code"**

## Step 2: Test It!

### Option A: Test on Your Site

1. Go to your app: `http://localhost:3000/account` (or your deployed URL)
2. Make sure you're signed in
3. Scroll to the subscription section
4. Click **"Have a promo code?"** to expand it
5. Enter your code (e.g., `FREEMONTH`)
6. Click **"Subscribe"** on any plan
7. Check Stripe checkout - you should see $0.00 for the first payment!

### Option B: Test on Stripe Checkout Directly

1. Go through checkout without entering a code
2. On Stripe's checkout page, click **"Add promotion code"** (if visible)
3. Enter your code there
4. Verify the discount applies

## Step 3: Verify It Works

After a successful test:
- Check your Stripe Dashboard → Coupons → "One Month Free"
- You should see "REDEMPTIONS" increase from 0 to 1
- The discount should show on the invoice/checkout

## Common Issues & Solutions

### "Code not found" error?
- Make sure you created a **Promotion Code**, not just a coupon
- Check you're in the right mode (Test vs Live)
- Verify the code spelling exactly matches (case-sensitive)

### Code not applying?
- Check the coupon is still active
- Verify expiration date hasn't passed
- Check redemption limits haven't been reached

### Want to test with real payment?
- Use Stripe test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC

## What Customers Will See

1. Customer goes to `/account` page
2. Sees "Have a promo code?" section
3. Enters code (e.g., `FREEMONTH`)
4. Clicks "Subscribe"
5. On checkout, sees $0.00 for first month
6. After first month, normal price applies

## For Production

When ready to go live:
1. Switch Stripe Dashboard to **Live mode** (top right toggle)
2. Create the same coupon again in Live mode
3. Create the same promotion code in Live mode
4. Update your environment variables to use Live API keys:
   - `pk_live_...` instead of `pk_test_...`
   - `sk_live_...` instead of `sk_test_...`

## Quick Reference

- **Coupon**: The discount rule (100% off once)
- **Promotion Code**: The code customers enter (`FREEMONTH`)
- **One coupon** can have **multiple promotion codes** (useful for different campaigns)


