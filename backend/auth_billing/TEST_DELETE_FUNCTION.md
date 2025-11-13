# Test Delete User Function

## Prerequisites

✅ Lambda function deployed: `predixa-delete-user-api`
✅ API Gateway endpoint: `DELETE /me/account`
✅ Cognito Authorizer configured
✅ IAM permissions set
✅ Backups created

---

## Test Methods

### Method 1: Using curl (Command Line)

```powershell
# Replace YOUR_JWT_TOKEN with actual Cognito JWT token
$TOKEN = "YOUR_COGNITO_JWT_TOKEN"
$URL = "https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account"

curl -X DELETE $URL `
    -H "Authorization: Bearer $TOKEN" `
    -v
```

### Method 2: Using Postman/Insomnia

1. **Method**: DELETE
2. **URL**: `https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account`
3. **Headers**:
   - `Authorization: Bearer YOUR_COGNITO_JWT_TOKEN`
4. **Body**: None (DELETE doesn't need body)
5. **Click Send**

### Method 3: Test in Lambda Console (Limited)

⚠️ **Note**: This won't test the full flow (no Cognito Authorizer), but can test Lambda logic:

1. Go to Lambda Console → `predixa-delete-user-api`
2. Click "Test" tab
3. Create test event:

```json
{
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "TEST_USER_COGNITO_SUB",
        "cognito:username": "TEST_USER_COGNITO_SUB",
        "email": "test@example.com"
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

4. ⚠️ **WARNING**: This will actually try to delete the user! Use a test user ID.

---

## Get Cognito JWT Token

### Option 1: From Your iOS App
- Sign in to your app
- Get the JWT token from the authentication response
- Use that token for testing

### Option 2: From AWS CLI

```powershell
# If you have a test user's credentials
aws cognito-idp initiate-auth `
    --auth-flow USER_PASSWORD_AUTH `
    --client-id YOUR_CLIENT_ID `
    --auth-parameters USERNAME=testuser@example.com,PASSWORD=TestPassword123! `
    --region us-east-1
```

This returns an `IdToken` which is the JWT you need.

### Option 3: From Cognito Console (Limited)
- Go to Cognito Console → Users
- View a user's details
- You can't get their JWT directly, but you can see their `sub` (cognito_sub)

---

## Expected Response

### Success (200 OK):
```json
{
  "success": true,
  "message": "User account deleted successfully",
  "deleted": {
    "cognito": true,
    "dynamodb_userprofiles": true,
    "dynamodb_entitlements": true,
    "stripe": true
  }
}
```

### Unauthorized (401):
```json
{
  "error": "Unauthorized - missing user identity"
}
```

### Error (500):
```json
{
  "success": false,
  "error": "Failed to delete user account",
  "details": {
    "cognito": false,
    "dynamodb_userprofiles": true,
    "dynamodb_entitlements": true,
    "stripe": true
  }
}
```

---

## Verification Steps

After successful deletion, verify:

### 1. Check DynamoDB
```powershell
# Check UserProfiles (user should be gone)
aws dynamodb get-item --table-name UserProfiles --key '{"userId":{"S":"COGNITO_SUB"}}' --region us-east-1

# Check entitlements (should be gone)
aws dynamodb get-item --table-name predixa_entitlements --key '{"cognito_sub":{"S":"COGNITO_SUB"}}' --region us-east-1
```

### 2. Check Cognito
```powershell
# Try to get user (should fail with UserNotFoundException)
aws cognito-idp admin-get-user --user-pool-id us-east-1_iYC6qs6H2 --username COGNITO_SUB --region us-east-1
```

### 3. Check Stripe (if customer existed)
- Go to Stripe Dashboard → Customers
- Search for the customer
- Should be deleted (or check via API)

### 4. Check CloudWatch Logs
- Go to Lambda Console → `predixa-delete-user-api` → Monitor tab
- Click "View logs in CloudWatch"
- Check for deletion logs

---

## Test Checklist

- [ ] Get valid Cognito JWT token
- [ ] Make DELETE request to API endpoint
- [ ] Verify response is 200 OK
- [ ] Check DynamoDB UserProfiles - user deleted
- [ ] Check DynamoDB predixa_entitlements - user deleted
- [ ] Check Cognito - user deleted
- [ ] Check Stripe - customer deleted (if existed)
- [ ] Check CloudWatch Logs for success

---

## Important Notes

⚠️ **Use a TEST user account** - This will permanently delete the user!

⚠️ **Backups are ready** - If something goes wrong, you can restore from backups

⚠️ **JWT Token expires** - Tokens expire after 1 hour, get a fresh one if needed

---

## Troubleshooting

**Error 401 Unauthorized:**
- JWT token is invalid or expired
- Get a fresh token
- Check token format: `Bearer YOUR_TOKEN`

**Error 403 Forbidden:**
- User ID mismatch (security check)
- Shouldn't happen if using valid JWT

**Error 500 Internal Server Error:**
- Check CloudWatch Logs for details
- Verify IAM permissions
- Check all services are accessible

**User not deleted:**
- Check CloudWatch Logs
- Verify IAM permissions for delete operations
- Check if user exists in all systems

---

**Ready to test!** 🚀

