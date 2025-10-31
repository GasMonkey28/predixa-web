# Stripe Billing Portal Setup Guide

## Quick Setup for Test Mode

To test subscription cancellation and management, you need to configure the Stripe Customer Portal:

### Step 1: Configure the Portal
1. Go to: https://dashboard.stripe.com/test/settings/billing/portal
2. Make sure you're in **Test Mode** (toggle in the top right)
3. Click **"Activate test link"** or **"Create default configuration"**

### Step 2: Configure Portal Features
Enable the features you want customers to access:
- ✅ **Cancel subscription** - Allow customers to cancel (you can choose immediate or end of period)
- ✅ **Update payment method** - Allow customers to update their card
- ✅ **View invoices** - Allow customers to view billing history
- ✅ **Switch plans** - Allow customers to upgrade/downgrade (optional)

### Step 3: Save Configuration
- Click **"Save"** at the bottom
- The portal is now active for test mode

## Testing Cancellation

Once configured:

1. **Subscribe** - Create a test subscription using test card `4242 4242 4242 4242`
2. **Click "Manage Subscription"** - This opens the Stripe Customer Portal
3. **Cancel Subscription** - In the portal, you'll see a "Cancel subscription" option
4. **Choose cancellation type**:
   - **Cancel immediately** - Subscription ends right away
   - **Cancel at period end** - Subscription continues until the end of the billing period

## Test Cards for Stripe

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`
- Use any future expiry date (e.g., `12/34`)
- Use any 3-digit CVC (e.g., `123`)

## Portal Features You Can Test

✅ **Cancel subscription** - Works in test mode  
✅ **Update payment method** - Works in test mode  
✅ **View invoices** - Works in test mode  
✅ **Switch plans** - Works in test mode (if enabled)  
✅ **Resume subscription** - Works if canceled at period end  

## After Cancellation

- The subscription status will update in your app
- You can test resuming a canceled subscription
- Cancellation webhooks will fire (if you have webhooks set up)
- Test mode cancellations don't charge real money

## Troubleshooting

**Error: "No configuration provided"**
- Make sure you're in Test Mode in Stripe Dashboard
- Visit https://dashboard.stripe.com/test/settings/billing/portal
- Click "Activate test link" or create a default configuration

**Portal not showing cancellation option**
- Check portal settings to ensure "Cancel subscription" is enabled
- Make sure you're testing with an active subscription

**Portal redirects to 404**
- Verify the portal is activated in test mode
- Check that your return URL is correct (`/account`)

