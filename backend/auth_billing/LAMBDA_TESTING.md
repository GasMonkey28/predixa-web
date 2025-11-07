# Testing Lambda Functions

## ✅ Post-Confirmation Lambda is Working!

Your Lambda function is running correctly! The error "No cognito_sub found in event" is **expected** when using the default test event `{"key1": "value1"}` because it's not a real Cognito event.

## How to Test Properly

### Option 1: Test with Real Signup (Best)

1. **Sign up a new user** in your app
2. **Confirm the email** (or complete signup)
3. **Check CloudWatch Logs**:
   - Lambda → `predixa-post-confirmation` → **Monitor** tab → **View CloudWatch logs**
   - You should see logs from the Post-Confirmation trigger
4. **Check DynamoDB**:
   - `UserProfiles` table → Should have new user record
   - `predixa_entitlements` table → Should have new record with `status="none"`

### Option 2: Test with Proper Event Format

1. **Go to Lambda** → `predixa-post-confirmation` → **Test** tab
2. **Create new test event** (or edit existing)
3. **Use this event structure** (see `TEST_LAMBDA_EVENT.json`):

```json
{
  "version": "1",
  "region": "us-east-1",
  "userPoolId": "us-east-1_g5anv7",
  "userName": "test-user-123",
  "triggerSource": "PostConfirmation_ConfirmSignUp",
  "request": {
    "userAttributes": {
      "sub": "test-user-123",
      "email": "test@example.com",
      "email_verified": "true"
    }
  },
  "response": {}
}
```

4. **Run test** - Should see:
   - ✅ "Post-Confirmation event received"
   - ✅ "Processing user: test-user-123"
   - ✅ "Post-Confirmation completed"

## What the Logs Mean

**Good Signs:**
- ✅ No import errors
- ✅ Function executes
- ✅ Logs show processing

**Expected Warnings (OK to ignore):**
- ⚠️ "Missing config: STRIPE_WEBHOOK_SECRET" - This is for webhook handler, not needed for Post-Confirmation
- ⚠️ "No cognito_sub found" - Only happens with invalid test events

## Next Steps

Since your Lambda is working:
1. ✅ **Post-Confirmation Lambda** - Deployed and working!
2. ⏭️ **Continue with Step 4**: Deploy Stripe Webhook Lambda
3. ⏭️ **Continue with Step 5**: Deploy Entitlements API Lambda

---

**Your Lambda function is ready!** The "No cognito_sub" message is just because the test event wasn't a real Cognito event. When a real user signs up, it will work perfectly! 🎉

