# How to Create Stripe Webhook

## Prerequisites

Before creating the webhook in Stripe, you need:
1. ✅ Stripe Webhook Lambda deployed (`predixa-stripe-webhook`)
2. ✅ API Gateway endpoint created for the webhook
3. ✅ API Gateway URL (you'll use this as the webhook endpoint)

**If you haven't deployed the Lambda yet, follow `DEPLOY_VIA_CONSOLE.md` Step 4 first!**

## Step-by-Step: Create Stripe Webhook

### Step 1: Get Your API Gateway URL

After deploying the Stripe Webhook Lambda and creating the API Gateway endpoint, you'll have a URL like:
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/stripe/webhook
```

**Save this URL** - you'll need it for Stripe.

### Step 2: Go to Stripe Dashboard

1. **Log in to Stripe Dashboard**: https://dashboard.stripe.com/
2. **Make sure you're in the correct mode**:
   - **Test mode** (for testing) - toggle in top right
   - **Live mode** (for production) - toggle in top right
3. **Go to Developers** → **Webhooks** (left sidebar)

### Step 3: Add Endpoint

1. Click **"+ Add endpoint"** button (top right)
2. **Endpoint URL**: Paste your API Gateway URL
   ```
   https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod/stripe/webhook
   ```
3. **Description** (optional): "Predixa Subscription Webhook"
4. **Events to send**: Click **"Select events"**

### Step 4: Select Events

Select these events (the Lambda handles these):

**Subscription Events:**
- ✅ `customer.subscription.created` - New subscription
- ✅ `customer.subscription.updated` - Subscription changed (upgrade/downgrade)
- ✅ `customer.subscription.deleted` - Subscription canceled

**Invoice Events:**
- ✅ `invoice.payment_succeeded` - Payment successful
- ✅ `invoice.payment_failed` - Payment failed

**How to select:**
1. Click **"Select events"**
2. Expand **"Customer"** section → Check the 3 subscription events
3. Expand **"Invoice"** section → Check the 2 invoice events
4. Click **"Add events"**

### Step 5: Create Webhook

1. Review your selections
2. Click **"Add endpoint"**
3. **Important**: Copy the **"Signing secret"** immediately!
   - It starts with `whsec_...`
   - You'll need this for the Lambda environment variable `STRIPE_WEBHOOK_SECRET`

### Step 6: Get Webhook Secret

After creating the webhook:

1. **Click on the webhook endpoint** you just created
2. **"Signing secret"** section → Click **"Reveal"**
3. **Copy the secret** (starts with `whsec_...`)
4. **Add to Lambda environment variables**:
   - Go to Lambda → `predixa-stripe-webhook`
   - Configuration → Environment variables
   - Add: `STRIPE_WEBHOOK_SECRET` = `whsec_...`

## Important Notes

### Test Mode vs Live Mode

- **Test mode webhooks** use test API keys and test events
- **Live mode webhooks** use live API keys and real events
- **You need separate webhooks** for test and live modes
- **You need separate Lambda functions** or use different environment variables

### Webhook URL Format

Your API Gateway endpoint should be:
- **Method**: `POST`
- **Path**: `/stripe/webhook` (or whatever you configured)
- **No authentication** (Stripe signature verification handles security)

### Testing the Webhook

1. **In Stripe Dashboard** → Your webhook → **"Send test webhook"**
2. **Select event**: `customer.subscription.created`
3. **Click "Send test webhook"**
4. **Check CloudWatch Logs** for your Lambda function
5. **Check DynamoDB** `predixa_entitlements` table for updates

## Troubleshooting

### Webhook Not Receiving Events

1. **Check API Gateway URL** is correct
2. **Check Lambda is deployed** and has correct handler
3. **Check CloudWatch Logs** for errors
4. **Check Stripe webhook logs** (in Stripe Dashboard → Webhooks → Your endpoint → Recent events)

### "Invalid signature" Error

- **Check `STRIPE_WEBHOOK_SECRET`** matches the webhook's signing secret
- **Make sure you're using the correct secret** (test vs live mode)
- **Verify API Gateway is passing raw body** (not parsed JSON)

### Events Not Updating DynamoDB

1. **Check Lambda logs** for errors
2. **Check IAM permissions** - Lambda needs DynamoDB write access
3. **Check environment variables** are set correctly
4. **Verify `cognitoSub` exists** in UserProfiles table (linked via Stripe customer ID)

## Quick Reference

**Webhook URL**: `https://your-api-gateway-url/stripe/webhook`
**Signing Secret**: `whsec_...` (from Stripe Dashboard)
**Events**: 5 events (3 subscription + 2 invoice)
**Lambda Handler**: `stripe_webhook_lambda.lambda_handler`

---

**After creating the webhook, make sure to add the signing secret to your Lambda environment variables!**

