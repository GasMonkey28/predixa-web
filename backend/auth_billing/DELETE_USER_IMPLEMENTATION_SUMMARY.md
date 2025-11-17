# Delete User Function - Implementation Summary

## ✅ Completed

### 1. Lambda Function Created
**File**: `delete_user_lambda.py`

- ✅ Extracts `cognito_sub` from API Gateway event (Cognito Authorizer)
- ✅ Deletes from DynamoDB UserProfiles table
- ✅ Deletes from DynamoDB predixa_entitlements table
- ✅ Deletes from Stripe (if customer exists)
- ✅ Deletes from Cognito
- ✅ Handles errors gracefully (partial failures don't block)
- ✅ Returns proper API Gateway response format
- ✅ Includes local test mode

### 2. Documentation Updated
- ✅ `DEPLOYMENT.md` - Added IAM permissions and deployment steps
- ✅ `README.md` - Added delete user function to architecture and setup
- ✅ `USER_DELETE_ROADMAP.md` - Complete roadmap document

### 3. IAM Permissions Documented
- ✅ Added `dynamodb:DeleteItem` permission
- ✅ Added `cognito-idp:AdminDeleteUser` permission

---

## 📋 Next Steps (You Need to Do)

### Step 1: Update IAM Role Permissions

Run these AWS CLI commands to add the required permissions:

```bash
# Add DynamoDB DeleteItem permission (if not already added)
aws iam put-role-policy \
  --role-name predixa-lambda-execution-role \
  --policy-name DynamoDBAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/UserProfiles",
        "arn:aws:dynamodb:us-east-1:*:table/predixa_entitlements"
      ]
    }]
  }'

# Add Cognito AdminDeleteUser permission
aws iam put-role-policy \
  --role-name predixa-lambda-execution-role \
  --policy-name CognitoDeleteUserAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminDeleteUser"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-1:*:userpool/*"
    }]
  }'
```

**Replace**:
- `us-east-1` with your AWS region if different
- `predixa-lambda-execution-role` with your actual Lambda execution role name

---

### Step 2: Create Deployment Package

```bash
cd backend/auth_billing

# Install dependencies (if not already done)
pip install -r requirements.txt -t .

# Create deployment package
zip -r delete_user_api.zip . \
  -x "*.pyc" "__pycache__/*" "*.git*" "*.md" "*.txt" \
  -x "post_confirmation_lambda.py" "stripe_webhook_lambda.py" "entitlements_api_lambda.py" \
  -x "delete_user.py" "find_duplicate_users.py"
```

---

### Step 3: Deploy Lambda Function

```bash
aws lambda create-function \
  --function-name predixa-delete-user-api \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/predixa-lambda-execution-role \
  --handler delete_user_lambda.lambda_handler \
  --zip-file fileb://delete_user_api.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx,COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX}"
```

**Replace**:
- `ACCOUNT_ID` with your AWS account ID
- `us-east-1` with your AWS region
- `sk_live_xxx` with your Stripe secret key
- `us-east-1_XXXXXXXXX` with your Cognito User Pool ID

---

### Step 4: Create API Gateway Endpoint

1. Go to AWS API Gateway Console
2. Select your existing API (or create a new one)
3. Create a new resource: `/me`
4. Create a new resource under `/me`: `/account`
5. Create a **DELETE** method on `/me/account`
6. Configure:
   - Integration type: Lambda Function
   - Lambda Function: `predixa-delete-user-api`
   - Enable CORS if needed
7. **Configure Cognito Authorizer**:
   - Type: Cognito User Pool
   - User Pool: Your Cognito User Pool ID
   - Token Source: Authorization
8. Deploy the API to a stage (e.g., `prod` or `dev`)

**Endpoint URL will be**: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/account`

---

### Step 5: Test the Endpoint

```bash
# Get your Cognito JWT token (from your app or Cognito console)
TOKEN="your-cognito-jwt-token"

# Test the delete endpoint
curl -X DELETE https://YOUR_API_GATEWAY_URL/me/account \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
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

---

### Step 6: iOS Integration

In your Swift app, add a function to call the delete endpoint:

```swift
func deleteAccount() async throws {
    // Get Cognito JWT token
    let token = try await getCognitoToken()
    
    // API Gateway endpoint
    let url = URL(string: "https://YOUR_API_GATEWAY_URL/me/account")!
    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    // Make request
    let (data, response) = try await URLSession.shared.data(for: request)
    
    // Check response
    if let httpResponse = response as? HTTPURLResponse,
       httpResponse.statusCode == 200 {
        // Success - clear local data and sign out
        clearLocalData()
        try await signOutFromCognito()
    } else {
        // Handle error
        throw DeleteAccountError.failed
    }
}
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] IAM role has `dynamodb:DeleteItem` permission
- [ ] IAM role has `cognito-idp:AdminDeleteUser` permission
- [ ] Lambda function deployed successfully
- [ ] API Gateway endpoint created (`DELETE /me/account`)
- [ ] Cognito Authorizer configured on endpoint
- [ ] Test deletion with a test user account
- [ ] Verify user deleted from Cognito
- [ ] Verify user deleted from DynamoDB UserProfiles
- [ ] Verify user deleted from DynamoDB predixa_entitlements
- [ ] Verify Stripe customer deleted (if existed)
- [ ] iOS app can call the endpoint successfully

---

## 📝 Notes

1. **Security**: The Cognito Authorizer ensures only authenticated users can delete accounts, and they can only delete their own account (extracted from JWT).

2. **Idempotency**: The function is safe to call multiple times - it handles already-deleted users gracefully.

3. **Error Handling**: Partial failures are logged but don't block the operation. If Cognito deletion succeeds, the user is effectively deleted even if DynamoDB/Stripe deletion fails.

4. **Logging**: All operations are logged to CloudWatch Logs for debugging.

5. **Testing**: Use the local test mode first: `python delete_user_lambda.py test` (but be careful - it will actually delete!)

---

## 🆘 Troubleshooting

**Error: Access Denied**
- Check IAM role permissions
- Verify Cognito User Pool ID is correct

**Error: User not found**
- User may already be deleted (this is OK - returns success)

**Error: Lambda timeout**
- Increase timeout to 60 seconds if needed
- Check CloudWatch Logs for slow operations

**Error: API Gateway 401**
- Verify Cognito Authorizer is configured
- Check JWT token is valid and not expired

---

## 📚 Related Files

- `delete_user_lambda.py` - Main Lambda function
- `delete_user.py` - CLI utility (for admin use)
- `DEPLOYMENT.md` - Full deployment guide
- `README.md` - Architecture documentation
- `USER_DELETE_ROADMAP.md` - Implementation roadmap

---

**Ready to deploy!** Follow the steps above to get the delete user function live. 🚀


