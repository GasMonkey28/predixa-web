# Deploy Delete User Lambda via AWS Console

## Step 1: Create Lambda Function

1. Go to **AWS Lambda Console**: https://console.aws.amazon.com/lambda/
2. Click **"Create function"**
3. Choose **"Author from scratch"**
4. Fill in:
   - **Function name**: `predixa-delete-user-api`
   - **Runtime**: `Python 3.11`
   - **Architecture**: `x86_64` (default)
   - **Permissions**: 
     - Expand "Change default execution role"
     - Choose **"Use an existing role"**
     - Select: `predixa-lambda-execution-role` (or your existing Lambda execution role)
5. Click **"Create function"**

---

## Step 2: Upload ZIP File

1. In the Lambda function page, scroll to **"Code source"** section
2. Click **"Upload from"** dropdown → Select **".zip file"**
3. Click **"Upload"** button
4. Browse and select: `delete_user_api.zip` (from `backend/auth_billing/` directory)
5. Wait for upload to complete (39.93 MB - may take a minute)

---

## Step 3: Configure Handler

1. In the **"Code"** tab, scroll down to **"Runtime settings"**
2. Click **"Edit"**
3. Set **Handler**: `delete_user_lambda.lambda_handler`
4. Click **"Save"**

---

## Step 4: Configure Environment Variables

1. Go to **"Configuration"** tab
2. Click **"Environment variables"** in left sidebar
3. Click **"Edit"**
4. Click **"Add environment variable"** for each:

   | Key | Value |
   |-----|-------|
   | `AWS_REGION` | `us-east-1` (or your region) |
   | `USERS_TABLE` | `UserProfiles` |
   | `ENTITLEMENTS_TABLE` | `predixa_entitlements` |
   | `STRIPE_API_KEY` | `sk_live_xxx` (your Stripe secret key) |
   | `COGNITO_USER_POOL_ID` | `us-east-1_XXXXXXXXX` (your Cognito User Pool ID) |

5. Click **"Save"**

---

## Step 5: Configure Timeout and Memory

1. In **"Configuration"** tab, click **"General configuration"**
2. Click **"Edit"**
3. Set:
   - **Timeout**: `30` seconds
   - **Memory**: `256` MB
4. Click **"Save"**

---

## Step 6: Verify IAM Permissions

1. In **"Configuration"** tab, click **"Permissions"** in left sidebar
2. Check the **Execution role** name
3. Click on the role name to open IAM Console
4. Verify the role has these permissions:

   **DynamoDB:**
   - `dynamodb:GetItem`
   - `dynamodb:PutItem`
   - `dynamodb:UpdateItem`
   - `dynamodb:DeleteItem` ✅ (for both UserProfiles and predixa_entitlements tables)

   **Cognito:**
   - `cognito-idp:AdminDeleteUser` ✅ (for your Cognito User Pool)

5. If missing, add them:
   - Click **"Add permissions"** → **"Create inline policy"**
   - Use JSON editor and add the missing permissions

---

## Step 7: Test the Function (Optional)

1. Go back to Lambda function
2. Click **"Test"** tab
3. Click **"Create new test event"**
4. Use this test event:

```json
{
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-123",
        "cognito:username": "test-user-123",
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

5. Click **"Save"** and then **"Test"**
6. ⚠️ **WARNING**: This will actually try to delete a user! Only test with a test user ID.

---

## Step 8: Create API Gateway Endpoint

1. Go to **API Gateway Console**: https://console.aws.amazon.com/apigateway/
2. Select your existing API (or create a new REST API)
3. Create resource:
   - Click **"Actions"** → **"Create Resource"**
   - Resource Name: `me`
   - Resource Path: `/me`
   - Click **"Create Resource"**
4. Create sub-resource:
   - Select `/me` resource
   - Click **"Actions"** → **"Create Resource"**
   - Resource Name: `account`
   - Resource Path: `/account`
   - Click **"Create Resource"**
5. Create DELETE method:
   - Select `/me/account` resource
   - Click **"Actions"** → **"Create Method"**
   - Select **DELETE** from dropdown
   - Click checkmark ✓
   - Configure:
     - Integration type: **Lambda Function**
     - Use Lambda Proxy integration: ✅ **Checked**
     - Lambda Region: Your region
     - Lambda Function: `predixa-delete-user-api`
   - Click **"Save"**
   - Click **"OK"** when prompted to give API Gateway permission

---

## Step 9: Configure Cognito Authorizer

1. In API Gateway, select your API
2. Click **"Authorizers"** in left sidebar
3. If you don't have a Cognito Authorizer yet:
   - Click **"Create New Authorizer"**
   - Name: `CognitoAuthorizer`
   - Type: **Cognito**
   - Cognito User Pool: Select your User Pool
   - Token Source: `Authorization`
   - Click **"Create"**
4. Apply authorizer to DELETE method:
   - Go to **Resources** → `/me` → `/account` → **DELETE**
   - Click **"Method Request"**
   - Authorization: Select your **Cognito Authorizer**
   - Click checkmark ✓ to save

---

## Step 10: Deploy API

1. Click **"Actions"** → **"Deploy API"**
2. Deployment stage: Select `prod` (or create new stage)
3. Click **"Deploy"**
4. Note the **Invoke URL** (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

---

## Step 11: Test the Endpoint

Your endpoint will be: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/account`

Test with curl (replace with your actual values):

```bash
curl -X DELETE https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/account \
  -H "Authorization: Bearer YOUR_COGNITO_JWT_TOKEN"
```

Or use Postman/Insomnia with:
- Method: DELETE
- URL: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/account`
- Headers: `Authorization: Bearer YOUR_COGNITO_JWT_TOKEN`

---

## ✅ Done!

Your delete user function is now live and accessible via API Gateway!

**Next**: Integrate this endpoint in your iOS app.

---

## Troubleshooting

**Error: "User is not authorized"**
- Check Cognito Authorizer is configured on the DELETE method
- Verify JWT token is valid and not expired

**Error: "Access Denied" in Lambda**
- Check IAM role has `cognito-idp:AdminDeleteUser` permission
- Check IAM role has `dynamodb:DeleteItem` permission

**Error: "Function not found"**
- Verify handler is set to: `delete_user_lambda.lambda_handler`
- Check ZIP file uploaded correctly

**Error: "Table not found"**
- Verify environment variables are set correctly
- Check table names match your DynamoDB tables
