# How to Find Stripe Webhook Secret

## The Problem

You've created the webhook in Stripe, but you don't see the webhook secret. This is normal - the secret is shown **AFTER** you save the webhook, not during creation.

## Step-by-Step: Find the Webhook Secret

### Step 1: Save the Webhook First

1. **Complete the webhook creation form**:
   - Endpoint URL: Your API Gateway URL
   - Events: Select the 5 events
   - Click **"Save destination"** (or **"Add endpoint"**)

### Step 2: View Webhook Details

After saving, you'll be taken to the webhook details page. If not:

1. **Go to Stripe Dashboard** → **Developers** → **Webhooks** (or **Destinations**)
2. **Click on your webhook name** (e.g., "Predixa Subscription Updates")
3. This opens the webhook details page

### Step 3: Find Signing Secret

On the webhook details page, look for:

1. **"Signing secret"** section (usually near the top, below the endpoint URL)
2. **Click "Reveal"** button to show the secret
3. **Copy the secret** - it starts with `whsec_...`
   - Example: `whsec_1234567890abcdefghijklmnopqrstuvwxyz`

### Step 4: Add to Lambda

1. **Go to AWS Lambda Console** → `predixa-stripe-webhook`
2. **Configuration** tab → **Environment variables**
3. **Edit `STRIPE_WEBHOOK_SECRET`**:
   - Click **Edit**
   - Paste the secret value
   - Click **Save**

## Where to Look (Different Stripe Interfaces)

### New Stripe Interface (Destinations)

1. **Developers** → **Destinations**
2. Click on your destination name
3. Look for **"Signing secret"** section
4. Click **"Reveal"**

### Classic Stripe Interface (Webhooks)

1. **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Look for **"Signing secret"** section
4. Click **"Reveal"**

## Troubleshooting

### Still Don't See Signing Secret?

1. **Make sure you saved the webhook** - The secret only appears after saving
2. **Check you're viewing the details page** - Click on the webhook name, not just the list
3. **Look in different sections**:
   - Top of the page (below endpoint URL)
   - Settings tab
   - Configuration section
4. **Try refreshing the page** - Sometimes it takes a moment to appear
5. **Check if you're in the right mode**:
   - Test mode webhooks have test secrets
   - Live mode webhooks have live secrets
   - Make sure you're looking at the correct one

### Secret Format

The webhook secret always starts with `whsec_` followed by a long string:
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz1234567890
```

### If You Lost the Secret

1. **Go to webhook details page**
2. **Look for "Reveal" or "Show" button** - The secret is hidden by default
3. **If you can't find it**, you may need to:
   - Delete and recreate the webhook (new secret will be generated)
   - Or contact Stripe support

## Quick Checklist

- ✅ Webhook saved successfully?
- ✅ On the webhook details page (clicked on webhook name)?
- ✅ Looked for "Signing secret" section?
- ✅ Clicked "Reveal" button?
- ✅ Copied the secret (starts with `whsec_`)?
- ✅ Added to Lambda environment variable `STRIPE_WEBHOOK_SECRET`?

---

**The secret is always there - you just need to reveal it!** 🔐

