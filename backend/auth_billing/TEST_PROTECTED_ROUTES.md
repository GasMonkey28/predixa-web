# Testing Protected Routes and Entitlements API

## What Are Protected Routes?

Your app has **two types of protected routes**:

### 1. Authentication-Required Routes (Just need to sign in)
- ✅ `/account` - Account management page
- Anyone who signs in can access

### 2. Subscription-Required Routes (Need active subscription)
- 🔒 `/daily` - Daily predictions page
- 🔒 `/weekly` - Weekly predictions page  
- 🔒 `/future` - Future predictions page
- Requires: Active subscription OR trial

## How It Works

The **middleware** (`middleware.ts`) automatically:
1. Checks if you're signed in
2. For subscription routes, calls the **Entitlements API** to check subscription status
3. Redirects to `/account?subscription_required=true` if no subscription

## Testing the Entitlements API

### Method 1: Test via Browser (Easiest)

1. **Sign in** to your app
2. **Open browser console** (F12)
3. **Navigate to a protected route** (e.g., `http://localhost:3000/daily`)
4. **Check the console logs** - You should see:
   ```
   Middleware: User has active subscription, allowing access
   ```
   OR
   ```
   Middleware: User does not have active subscription, redirecting to account
   ```

### Method 2: Test API Directly

1. **Get your ID token**:
   - Sign in to your app
   - Open browser console (F12)
   - Run:
     ```javascript
     const session = await fetchAuthSession()
     console.log(session.tokens.idToken.toString())
     ```
   - Copy the token

2. **Test the API**:
   - Go to: `http://localhost:3000/api/entitlements`
   - Or use curl:
     ```bash
     curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
          http://localhost:3000/api/entitlements
     ```

3. **Expected Response**:
   ```json
   {
     "status": "active",
     "subscriptionId": "sub_xxx",
     "stripeCustomerId": "cus_xxx",
     "updatedAt": "2025-11-07T..."
   }
   ```

### Method 3: Check DynamoDB Directly

1. **Go to DynamoDB Console** → `predixa_entitlements` table
2. **Search for your Cognito sub** (from UserProfiles table)
3. **Check the `status` field**:
   - `"none"` = No subscription
   - `"active"` = Active subscription ✅
   - `"trialing"` = In trial period ✅
   - `"past_due"` = Payment failed
   - `"canceled"` = Subscription canceled

## Verify Webhook Processed Subscription

Since you subscribed via Stripe, check if the webhook Lambda processed it:

1. **Go to Lambda Console** → `predixa-stripe-webhook`
2. **Monitor** tab → **View CloudWatch logs**
3. **Look for recent logs** showing:
   - `customer.subscription.created` event processed
   - DynamoDB entitlement updated to `status="active"`

If you don't see logs:
- Check if webhook is configured in Stripe
- Check if webhook secret is set in Lambda environment variables
- Check Stripe Dashboard → Webhooks → Your endpoint → Recent events

## Test Flow

### Scenario 1: User Without Subscription
1. Sign in
2. Try to access `/daily`
3. **Expected**: Redirected to `/account?subscription_required=true`
4. Subscribe via Stripe
5. Try `/daily` again
6. **Expected**: Access granted ✅

### Scenario 2: User With Active Subscription
1. Sign in (with active subscription)
2. Navigate to `/daily`
3. **Expected**: Page loads successfully ✅
4. Check browser console - should see subscription check passed

## Troubleshooting

### "ENTITLEMENTS_API_GATEWAY_URL not configured"
- **Fix**: Add environment variable to Vercel (Step 9)
- **Local**: Add to `.env.local`:
  ```
  ENTITLEMENTS_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
  ```

### API Returns 401 (Unauthorized)
- **Check**: Are you signed in?
- **Check**: Is the ID token valid?
- **Check**: Is Cognito Authorizer configured correctly in API Gateway?

### API Returns 500 (Server Error)
- **Check**: Lambda function logs in CloudWatch
- **Check**: Environment variables are set correctly
- **Check**: DynamoDB permissions for Lambda role

### Subscription Status Still "none" After Subscribing
- **Check**: Webhook Lambda logs - did it process the event?
- **Check**: Stripe webhook delivery status
- **Check**: DynamoDB table - was it updated?

---

## Quick Test Checklist

- [ ] Sign in to app
- [ ] Try accessing `/daily` (should redirect if no subscription)
- [ ] Subscribe via Stripe
- [ ] Check DynamoDB `predixa_entitlements` - status should be "active"
- [ ] Check webhook Lambda logs - should show subscription event processed
- [ ] Try accessing `/daily` again - should work now!
- [ ] Check browser console for middleware logs

---

**Test it now!** Try accessing `/daily` and see what happens! 🚀

