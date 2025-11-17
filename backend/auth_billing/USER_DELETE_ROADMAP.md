# User Delete Function - Implementation Roadmap

## Overview
Create a Lambda function that allows users to delete their account across all systems:
- AWS Cognito (user authentication)
- DynamoDB UserProfiles table
- DynamoDB predixa_entitlements table  
- Stripe (customer record)

This will be accessible via API Gateway with Cognito Authorizer, so iOS app can call it.

## Current State Analysis

### ✅ What Exists
1. **`delete_user.py`** - CLI utility script with all delete logic
   - Deletes from Cognito
   - Deletes from DynamoDB (both tables)
   - Deletes from Stripe
   - Can find user by email or cognito_sub

2. **User Creation Flow** (`post_confirmation_lambda.py`)
   - Creates Stripe customer
   - Writes to UserProfiles table
   - Initializes entitlements table

3. **API Gateway Pattern** (`entitlements_api_lambda.py`)
   - Uses Cognito Authorizer
   - Extracts user from JWT token
   - Returns proper API Gateway response

### ❌ What's Missing
1. Lambda function for API Gateway (DELETE endpoint)
2. API Gateway endpoint configuration
3. IAM permissions for Cognito deletion
4. Deployment package

---

## Step-by-Step Implementation Plan

### **Step 1: Create Delete User Lambda Function**
**File**: `delete_user_lambda.py`

**What it does**:
- Extract `cognito_sub` from API Gateway event (Cognito Authorizer)
- Reuse logic from `delete_user.py` but adapt for Lambda
- Delete from all systems:
  1. DynamoDB UserProfiles
  2. DynamoDB predixa_entitlements
  3. Stripe customer (if exists)
  4. Cognito user
- Return success/error response

**Key Requirements**:
- Must be authenticated (Cognito Authorizer ensures this)
- User can only delete their own account
- Handle partial failures gracefully
- Log all operations

---

### **Step 2: Update IAM Role Permissions**
**Current**: Lambda role has DynamoDB permissions
**Needed**: Add Cognito deletion permission

**Add to Lambda execution role**:
```json
{
  "Effect": "Allow",
  "Action": [
    "cognito-idp:AdminDeleteUser"
  ],
  "Resource": "arn:aws:cognito-idp:REGION:ACCOUNT_ID:userpool/USER_POOL_ID"
}
```

---

### **Step 3: Create Deployment Package**
**File**: `delete_user_api.zip`

**Package contents**:
- `delete_user_lambda.py` (handler)
- `config.py`
- `ddb.py`
- `utils.py`
- Dependencies (boto3, stripe) - already in Lambda runtime or package

**Deployment command**:
```bash
cd backend/auth_billing
zip -r delete_user_api.zip . \
  -x "*.pyc" "__pycache__/*" "*.git*" "*.md" "*.txt" \
  -x "post_confirmation_lambda.py" "stripe_webhook_lambda.py" "entitlements_api_lambda.py" \
  -x "delete_user.py" "find_duplicate_users.py"
```

---

### **Step 4: Deploy Lambda Function**
**Function Name**: `predixa-delete-user-api`

**Configuration**:
- Runtime: Python 3.11
- Handler: `delete_user_lambda.lambda_handler`
- Timeout: 30 seconds (deleting from multiple systems)
- Memory: 256 MB
- Environment Variables: Same as other Lambdas
- IAM Role: Updated with Cognito permissions

**AWS CLI Command**:
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

---

### **Step 5: Create API Gateway Endpoint**
**Endpoint**: `DELETE /me/account` or `DELETE /me`

**Configuration**:
- Method: DELETE
- Integration: Lambda Function (`predixa-delete-user-api`)
- **Cognito Authorizer**: 
  - Type: Cognito User Pool
  - User Pool: Your Cognito User Pool ID
  - Token Source: Authorization
- CORS: Enable if needed for web app

**Why DELETE /me/account?**
- RESTful: DELETE for deletion
- `/me` indicates current user
- `/account` is clear about what's being deleted

---

### **Step 6: Test Locally**
**Test the Lambda function**:
```bash
cd backend/auth_billing
python delete_user_lambda.py test
```

**Test with API Gateway event**:
- Simulate API Gateway event with Cognito claims
- Verify all deletions work
- Check error handling

---

### **Step 7: Test in AWS**
**Test via API Gateway**:
```bash
curl -X DELETE https://YOUR_API_GATEWAY_URL/me/account \
  -H "Authorization: Bearer YOUR_COGNITO_JWT"
```

**Verify**:
1. ✅ User deleted from Cognito
2. ✅ User deleted from UserProfiles table
3. ✅ User deleted from predixa_entitlements table
4. ✅ Stripe customer deleted (if exists)
5. ✅ Returns 200 OK response

---

### **Step 8: iOS Integration (Your Part)**
**Swift Implementation**:
1. Add DELETE request to API Gateway endpoint
2. Include Cognito JWT token in Authorization header
3. Handle success/error responses
4. Clear local app data after successful deletion
5. Sign out user from Cognito SDK

**Example Swift code structure**:
```swift
func deleteAccount() async throws {
    let token = await getCognitoToken()
    let url = URL(string: "https://API_GATEWAY_URL/me/account")!
    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let (_, response) = try await URLSession.shared.data(for: request)
    // Handle response, clear local data, sign out
}
```

---

## Implementation Order

1. ✅ **Step 1**: Create `delete_user_lambda.py` (reuse logic from `delete_user.py`)
2. ✅ **Step 2**: Update IAM role permissions
3. ✅ **Step 3**: Create deployment package
4. ✅ **Step 4**: Deploy Lambda function
5. ✅ **Step 5**: Create API Gateway endpoint
6. ✅ **Step 6**: Test locally
7. ✅ **Step 7**: Test in AWS
8. ⏳ **Step 8**: iOS integration (you'll do this)

---

## Security Considerations

1. **Authentication**: Cognito Authorizer ensures only authenticated users can call
2. **Authorization**: User can only delete their own account (extracted from JWT)
3. **Idempotency**: Safe to call multiple times (handles already-deleted gracefully)
4. **Logging**: All operations logged to CloudWatch
5. **Error Handling**: Partial failures logged but don't expose sensitive info

---

## Error Scenarios

1. **User not found in DynamoDB**: Continue with Cognito/Stripe deletion
2. **Stripe customer not found**: Continue with other deletions
3. **Cognito user already deleted**: Return success (idempotent)
4. **Network errors**: Return 500, log error, user can retry

---

## Next Steps

Ready to start? We'll implement step by step:
1. First, I'll create the Lambda function
2. Then we'll update IAM permissions
3. Create deployment package
4. Deploy and test

Let me know when you're ready to begin!


