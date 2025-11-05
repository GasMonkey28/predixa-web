# Stripe Promo Code Setup Guide

This guide explains how to set up promo codes (like "1 month free") in Stripe for your subscription system.

## Overview

Your application now supports promo codes in two ways:
1. **Automatic**: Customers can enter promo codes directly on Stripe's checkout page (enabled by default)
2. **Manual**: Customers can enter promo codes in your app's UI before checkout

## Stripe Setup: Test vs Production

### Test Mode (Development)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/coupons) (make sure you're in **Test mode** - toggle in top right)
2. Navigate to **Products** → **Coupons** (or direct link: https://dashboard.stripe.com/test/coupons)
3. Create your promo codes here for testing

### Production Mode (Live)
1. Toggle to **Live mode** in Stripe Dashboard (top right)
2. Navigate to **Products** → **Coupons**
3. Create your promo codes here for real customers

⚠️ **Important**: Promo codes created in Test mode won't work in Production mode, and vice versa. You need to create them separately in each mode.

## Creating a "1 Month Free" Promo Code

### Option 1: 100% Off First Month (Recommended)

1. **Create a Coupon:**
   - Go to Stripe Dashboard → **Products** → **Coupons**
   - Click **"Create coupon"**
   - Configure:
     - **Name**: "1 Month Free"
     - **Type**: `Percentage` → `100%` OR `Amount off` → `$19.99` (your monthly price)
     - **Duration**: `Once` (applies only to first payment)
     - **Redemption limits** (optional): Set max redemptions if needed
   - Click **"Create coupon"**

2. **Create a Promotion Code:**
   - After creating the coupon, click **"Create promotion code"**
   - **Code**: Enter your promo code (e.g., `FREEMONTH`, `1MONTHFREE`)
   - **Customer eligibility**: Choose restrictions if needed
   - **Expiration**: Set if you want it to expire
   - Click **"Create promotion code"**

### Option 2: Free Trial (Alternative)

If you want a true free trial (no charge for first month), you can also:
1. Set up a subscription with a trial period in Stripe
2. Use Stripe's trial period feature instead of a coupon

## Example Promo Codes to Create

### For Testing:
- **FREEMONTH** - 100% off first month
- **SAVE20** - 20% off first month
- **WELCOME10** - $10 off first month

### For Production:
Create the same codes in Live mode when ready to launch.

## How It Works

### Method 1: Customer Enters Code on Your Site
1. Customer clicks "Have a promo code?" on the account page
2. Enters their promo code
3. Clicks "Subscribe"
4. Code is automatically applied to the checkout session

### Method 2: Customer Enters Code on Stripe Checkout
1. Customer clicks "Subscribe" (without entering code)
2. On Stripe's checkout page, they can click "Add promotion code"
3. Enter the code directly on Stripe's page
4. Discount is applied before payment

## Testing Promo Codes

### Test Mode Testing:
1. Make sure you're using test API keys:
   - `pk_test_...` for publishable key
   - `sk_test_...` for secret key
2. Create a test promo code in Stripe Test Dashboard
3. Use test card numbers (e.g., `4242 4242 4242 4242`) for checkout
4. Enter your test promo code

### Test Credit Cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Use any future expiry date and any 3-digit CVC

## Code Implementation Details

### What Was Changed:

1. **API Endpoint** (`src/app/api/stripe/create-checkout-session/route.ts`):
   - Accepts `promoCode` parameter
   - Validates promo code before creating checkout session
   - Applies discount if valid code is provided
   - Enables `allow_promotion_codes: true` so customers can also enter codes on Stripe's page

2. **Stripe Store** (`src/lib/stripe-store.ts`):
   - `createCheckoutSession` now accepts optional `promoCode` parameter

3. **Account Page** (`src/app/account/page.tsx`):
   - Added collapsible promo code input field
   - Promo code is passed to checkout session when provided

## Common Promo Code Scenarios

### 1. First Month Free (100% off)
- **Coupon Type**: Percentage, 100%
- **Duration**: Once
- **Use Case**: New customer acquisition

### 2. Discount for First Month (e.g., 50% off)
- **Coupon Type**: Percentage, 50%
- **Duration**: Once
- **Use Case**: Limited-time promotion

### 3. Recurring Discount (e.g., 20% off forever)
- **Coupon Type**: Percentage, 20%
- **Duration**: Forever
- **Use Case**: Loyalty programs

### 4. Fixed Amount Off (e.g., $10 off)
- **Coupon Type**: Amount off, $10.00
- **Duration**: Once or Forever
- **Use Case**: Specific dollar savings

## Troubleshooting

### Promo Code Not Working?
1. **Check Mode**: Make sure you're using test codes with test keys, or live codes with live keys
2. **Check Expiration**: Verify the promo code hasn't expired
3. **Check Redemption Limits**: Ensure the code hasn't exceeded max redemptions
4. **Check Customer Eligibility**: Some codes are restricted to specific customers
5. **Check Console**: Look for error messages in browser console or server logs

### Code Not Found Error?
- The code will still proceed to checkout even if promo code is invalid
- Check Stripe Dashboard to verify the code exists and is active
- Make sure you're checking the correct mode (test vs live)

## Best Practices

1. **Test First**: Always test promo codes in Test mode before using in Production
2. **Set Limits**: Use redemption limits to prevent abuse
3. **Set Expiration**: Add expiration dates for time-limited promotions
4. **Monitor Usage**: Check Stripe Dashboard regularly to see promo code usage
5. **Clear Names**: Use descriptive coupon names (e.g., "Black Friday 2024 - 50% Off")

## Need Help?

- **Stripe Documentation**: https://stripe.com/docs/billing/subscriptions/discounts
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Test Mode**: https://dashboard.stripe.com/test/coupons
- **Live Mode**: https://dashboard.stripe.com/coupons (toggle to Live mode first)


