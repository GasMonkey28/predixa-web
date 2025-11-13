# Troubleshooting 401 Unauthorized Error

## Problem
Getting `401 Unauthorized - missing user identity` when testing delete function.

## Causes

### 1. Testing Directly in Lambda Console (Most Common)

**Issue**: Testing Lambda directly with test event doesn't include Cognito Authorizer data.

**Solution**: You MUST test via API Gateway, not directly in Lambda Console.

**Why**: 
- Cognito Authorizer runs in API Gateway, not Lambda
- API Gateway validates JWT and adds user info to event
- Lambda only sees the processed event

---

### 2. Invalid or Missing JWT Token

**Issue**: JWT token is invalid, expired, or not being sent correctly.

**Check**:
- Token is not expired (tokens expire after 1 hour)
- Token is sent in header: `Authorization: Bearer <TOKEN>`
- Token is from the correct Cognito User Pool

**Solution**: Get a fresh JWT token by signing in again.

---

### 3. API Gateway Cognito Authorizer Not Configured

**Issue**: Cognito Authorizer not properly configured on the DELETE method.

**Check**:
1. Go to API Gateway Console
2. Navigate to `/me/account` → DELETE method
3. Check "Method Request" → Authorization
4. Should show your Cognito Authorizer (not "NONE")

**Solution**: Configure Cognito Authorizer on the DELETE method.

---

## How to Test Correctly

### ✅ Correct Way: Test via API Gateway

**From iOS App or curl:**
```powershell
curl -X DELETE https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**This works because:**
1. API Gateway receives request
2. Cognito Authorizer validates JWT token
3. Adds user claims to event
4. Forwards to Lambda with user info

---

### ❌ Wrong Way: Test in Lambda Console

**Don't test directly in Lambda Console** - it won't have Cognito Authorizer data.

If you must test in Lambda Console, use this test event (but it won't actually delete anything):

```json
{
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "google_100578348725685118649",
        "cognito:username": "google_100578348725685118649",
        "email": "kerendeyouxiang02@gmail.com"
      }
    }
  },
  "headers": {
    "Authorization": "Bearer test-token"
  },
  "httpMethod": "DELETE",
  "path": "/me/account"
}
```

⚠️ **Warning**: This will actually try to delete the user! Only use with test user.

---

## Environment Variables

### Required Environment Variables

The Lambda needs these (check in Lambda Console → Configuration → Environment variables):

- `AWS_REGION` = `us-east-1`
- `USERS_TABLE` = `UserProfiles`
- `ENTITLEMENTS_TABLE` = `predixa_entitlements`
- `COGNITO_USER_POOL_ID` = `us-east-1_iYC6qs6H2` ✅ **IMPORTANT for Cognito deletion**
- `STRIPE_API_KEY` = `sk_live_xxx` (optional, for Stripe deletion)

### Check Environment Variables

1. Go to Lambda Console → `predixa-delete-user-api`
2. Click "Configuration" tab
3. Click "Environment variables"
4. Verify all are set correctly

---

## Step-by-Step Fix

### Step 1: Verify API Gateway Configuration

1. Go to API Gateway Console
2. Select your API → `/me/account` → DELETE
3. Check "Method Request" tab
4. **Authorization** should be: `CognitoAuthorizer` (not "NONE")
5. If it's "NONE", set it to your Cognito Authorizer

### Step 2: Get Valid JWT Token

1. Sign in as test user in your iOS app
2. Get the `idToken` from auth response
3. Make sure token is not expired (get fresh one if needed)

### Step 3: Test via API Gateway

```powershell
# Replace with actual token
$TOKEN = "YOUR_FRESH_JWT_TOKEN"
curl -X DELETE https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account -H "Authorization: Bearer $TOKEN" -v
```

### Step 4: Check Response

**Success (200):**
```json
{
  "success": true,
  "message": "User account deleted successfully"
}
```

**Still 401?**
- Check token is valid and not expired
- Check Authorization header format: `Bearer <TOKEN>` (with space)
- Check Cognito Authorizer is configured on DELETE method

---

## Common Mistakes

❌ **Testing in Lambda Console directly** - Won't work, no Cognito Authorizer
✅ **Test via API Gateway** - Correct way

❌ **Using expired token** - Tokens expire after 1 hour
✅ **Get fresh token** - Sign in again to get new token

❌ **Wrong header format** - `Authorization: <TOKEN>` (missing "Bearer ")
✅ **Correct format** - `Authorization: Bearer <TOKEN>`

❌ **Cognito Authorizer not set** - Method shows "NONE"
✅ **Set Cognito Authorizer** - Configure on DELETE method

---

## Quick Checklist

- [ ] Testing via API Gateway (not Lambda Console directly)
- [ ] JWT token is fresh (not expired)
- [ ] Authorization header: `Bearer <TOKEN>` (with space)
- [ ] Cognito Authorizer configured on DELETE method
- [ ] Environment variables set (especially `COGNITO_USER_POOL_ID`)
- [ ] API Gateway endpoint deployed

---

## Still Getting 401?

1. **Check CloudWatch Logs** for more details
2. **Verify token** by decoding at https://jwt.io (don't share publicly!)
3. **Test with Postman/Insomnia** to see exact request/response
4. **Check API Gateway logs** for authorization failures

---

**The key issue**: You're testing directly in Lambda Console. Test via API Gateway instead! 🚀

