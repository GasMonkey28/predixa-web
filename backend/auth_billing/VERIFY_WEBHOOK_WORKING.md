# Verify Stripe Webhook is Working

## Quick Check

Since you subscribed via Stripe, let's verify the webhook processed the subscription:

### Step 1: Check Webhook Lambda Logs

1. **Go to Lambda Console** → `predixa-stripe-webhook`
2. **Monitor** tab → **View CloudWatch logs**
3. **Look for recent log streams** (should be from when you subscribed)
4. **Check for logs** showing:
   - ✅ `customer.subscription.created` event received
   - ✅ DynamoDB entitlement updated
   - ✅ Status changed to `"active"`

### Step 2: Check Stripe Webhook Delivery

1. **Go to Stripe Dashboard** → **Developers** → **Webhooks**
2. **Click on your webhook endpoint**
3. **Check "Recent events"** section
4. **Look for**:
   - `customer.subscription.created` - Should show "Succeeded" ✅
   - `invoice.payment_succeeded` - Should show "Succeeded" ✅

### Step 3: Check DynamoDB

1. **Go to DynamoDB Console** → `predixa_entitlements` table
2. **Search for your Cognito sub** (from UserProfiles table)
3. **Check the `status` field**:
   - Should be `"active"` if webhook processed successfully ✅
   - If still `"none"`, webhook didn't process (see troubleshooting below)

## Troubleshooting

### No Logs in Lambda

**Possible issues:**
1. **Webhook not configured** - Check Stripe Dashboard → Webhooks
2. **API Gateway URL incorrect** - Verify webhook endpoint URL in Stripe
3. **Webhook secret missing** - Check Lambda environment variable `STRIPE_WEBHOOK_SECRET`

**Fix:**
- Re-check Step 8 in `DEPLOY_VIA_CONSOLE.md`
- Make sure webhook endpoint URL is correct
- Make sure webhook secret is added to Lambda

### Webhook Shows "Failed" in Stripe

**Check Lambda logs** for error messages:
- Invalid signature? → Webhook secret mismatch
- DynamoDB error? → Check IAM permissions
- Lambda timeout? → Increase timeout setting

### Status Still "none" in DynamoDB

**Manual fix** (if webhook didn't process):
1. Go to DynamoDB → `predixa_entitlements` table
2. Find your record (by Cognito sub)
3. Edit item:
   - `status`: Change to `"active"`
   - `updatedAt`: Current timestamp
   - `subscriptionId`: Your Stripe subscription ID (from Stripe Dashboard)
4. Save

**Or re-trigger webhook:**
1. Go to Stripe Dashboard → Webhooks → Your endpoint
2. Click on `customer.subscription.created` event
3. Click "Send test webhook" or "Replay event"

---

**Check these three things to verify everything is working!** ✅

