# Predixa Auth & Billing Lambda Functions

Production-ready DynamoDB-based user management layer that tracks authentication (Cognito) and billing state (Stripe) for the Predixa app.

## Architecture

- **Post-Confirmation Lambda**: Creates Stripe customer + DynamoDB user row on signup
- **Stripe Webhook Lambda**: Updates DynamoDB entitlements table from Stripe events
- **Entitlements API Lambda**: Returns subscription status for authenticated users
- **Delete User API Lambda**: Allows users to delete their account across all systems (Cognito, DynamoDB, Stripe)

## Table Design

### UserProfiles (Extended)
- **PK**: `userId` (string) - Cognito user ID
- `email` (string)
- `stripeCustomerId` (string) - Added by Post-Confirmation
- `createdAt` (ISO 8601)
- `updatedAt` (ISO 8601)
- Additional profile fields (givenName, familyName, etc.)

### predixa_entitlements
- **PK**: `cognito_sub` (string) - Cognito user ID
- `status` (string) - `active`, `trialing`, `past_due`, `canceled`, `none`
- `plan` (string) - Stripe price ID
- `current_period_end` (number) - Unix timestamp
- `trial_expires_at` (number) - Unix timestamp (optional)
- `updatedAt` (ISO 8601)

## Setup

### 1. Create DynamoDB Tables

#### UserProfiles (if not exists)
```bash
aws dynamodb create-table \
  --table-name UserProfiles \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

#### predixa_entitlements
```bash
aws dynamodb create-table \
  --table-name predixa_entitlements \
  --attribute-definitions AttributeName=cognito_sub,AttributeType=S \
  --key-schema AttributeName=cognito_sub,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Environment Variables

Set these in your Lambda function configurations:

```bash
AWS_REGION=us-east-1
USERS_TABLE=UserProfiles
ENTITLEMENTS_TABLE=predixa_entitlements
STRIPE_API_KEY=sk_live_xxx  # or sk_test_xxx for testing
STRIPE_WEBHOOK_SECRET=whsec_xxx  # from Stripe Dashboard
TRIAL_DAYS=14  # Optional, for reference
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX  # Optional, for JWT verification
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxx  # Optional
```

### 3. IAM Permissions

Your Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
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
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminDeleteUser"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-1:*:userpool/*"
    }
  ]
}
```

### 4. Lambda Function Setup

#### Post-Confirmation Lambda
1. Create Lambda function (Python 3.11)
2. Set handler: `post_confirmation_lambda.lambda_handler`
3. Add as Cognito Post-Confirmation trigger
4. Set environment variables
5. Set timeout: 30 seconds
6. Set memory: 256 MB

#### Stripe Webhook Lambda
1. Create Lambda function (Python 3.11)
2. Set handler: `stripe_webhook_lambda.lambda_handler`
3. Create API Gateway endpoint: `POST /stripe/webhook`
4. Set environment variables (including `STRIPE_WEBHOOK_SECRET`)
5. Set timeout: 30 seconds
6. Set memory: 256 MB
7. Configure in Stripe Dashboard → Webhooks → Add endpoint

#### Entitlements API Lambda
1. Create Lambda function (Python 3.11)
2. Set handler: `entitlements_api_lambda.lambda_handler`
3. Create API Gateway endpoint: `GET /me/entitlements`
4. **Configure Cognito Authorizer** in API Gateway:
   - Type: Cognito User Pool
   - User Pool: Your Cognito User Pool ID
   - Token Source: Authorization
5. Set environment variables
6. Set timeout: 10 seconds
7. Set memory: 128 MB

#### Delete User API Lambda
1. Create Lambda function (Python 3.11)
2. Set handler: `delete_user_lambda.lambda_handler`
3. Create API Gateway endpoint: `DELETE /me/account`
4. **Configure Cognito Authorizer** in API Gateway:
   - Type: Cognito User Pool
   - User Pool: Your Cognito User Pool ID
   - Token Source: Authorization
5. Set environment variables (including `COGNITO_USER_POOL_ID`)
6. Set timeout: 30 seconds (deleting from multiple systems)
7. Set memory: 256 MB
8. **Ensure IAM role has permissions**:
   - `dynamodb:DeleteItem` (for both tables)
   - `cognito-idp:AdminDeleteUser`

## Deployment

### Option 1: AWS CLI (PowerShell)

```powershell
# Package the Lambda function
cd backend/auth_billing
pip install -r requirements.txt -t .
zip -r function.zip . -x "*.pyc" "__pycache__/*" "*.git*"

# Create/update Lambda function
aws lambda create-function `
  --function-name predixa-post-confirmation `
  --runtime python3.11 `
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role `
  --handler post_confirmation_lambda.lambda_handler `
  --zip-file fileb://function.zip `
  --timeout 30 `
  --memory-size 256 `
  --environment "Variables={AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx}"

# Update environment variables (PowerShell colon trap avoided)
aws lambda update-function-configuration `
  --function-name predixa-post-confirmation `
  --environment "Variables={AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx}"
```

### Option 2: AWS SAM / CDK

See AWS documentation for SAM/CDK deployment patterns.

## Testing

### Local Testing

Each Lambda includes a test mode:

```bash
# Test Post-Confirmation
cd backend/auth_billing
python post_confirmation_lambda.py test

# Test Webhook
python stripe_webhook_lambda.py test

# Test Entitlements API
python entitlements_api_lambda.py test

# Test Delete User API (WARNING: This will delete a user!)
python delete_user_lambda.py test
```

### Integration Testing

1. **Post-Confirmation**: Sign up a new user in Cognito, check:
   - Stripe customer created
   - UserProfiles record created
   - Entitlements record initialized with `status="none"`

2. **Webhook**: Send test webhook from Stripe Dashboard:
   - `customer.subscription.created` → Should update entitlements
   - `customer.subscription.updated` → Should update entitlements
   - `customer.subscription.deleted` → Should set status to "canceled"

3. **Entitlements API**: Call API Gateway endpoint:
   - With valid JWT → Returns subscription status
   - With invalid JWT → Returns 401
   - New user (no entitlements) → Returns `status="none"`

4. **Delete User API**: Call API Gateway endpoint:
   - With valid JWT → Deletes user from all systems, returns success
   - With invalid JWT → Returns 401
   - Verify deletion in Cognito, DynamoDB, and Stripe

## Flow Diagram

```
User Signup
    ↓
Cognito Post-Confirmation Trigger
    ↓
Post-Confirmation Lambda
    ├─→ Create Stripe Customer
    ├─→ Write to UserProfiles (with stripeCustomerId)
    └─→ Init entitlements (status="none")
    
User Subscribes
    ↓
Stripe Checkout
    ↓
Stripe Webhook (subscription.created)
    ↓
Webhook Lambda
    └─→ Update entitlements (status="trialing" or "active")
    
User Accesses App
    ↓
Frontend calls /me/entitlements
    ↓
API Gateway (Cognito Authorizer validates JWT)
    ↓
Entitlements API Lambda
    └─→ Return status from DynamoDB
    
User Deletes Account
    ↓
Frontend/iOS calls DELETE /me/account
    ↓
API Gateway (Cognito Authorizer validates JWT)
    ↓
Delete User API Lambda
    ├─→ Delete from DynamoDB UserProfiles
    ├─→ Delete from DynamoDB predixa_entitlements
    ├─→ Delete from Stripe
    └─→ Delete from Cognito
```

## Error Handling

- **Post-Confirmation**: Never fails user signup - logs errors but returns event
- **Webhook**: Returns 500 on error (Stripe will retry)
- **Entitlements API**: Returns `status="none"` if record missing (not an error)

## Security

- ✅ Stripe webhook signature verification
- ✅ API Gateway Cognito Authorizer (JWT validation)
- ✅ IAM least-privilege permissions
- ✅ Environment variables for secrets (use AWS Secrets Manager for production)

## Monitoring

Monitor CloudWatch Logs for:
- Post-Confirmation failures (should be rare)
- Webhook processing errors
- Entitlements API 401s (authentication issues)

Set up CloudWatch Alarms for:
- Lambda errors
- DynamoDB throttling
- Stripe webhook delivery failures

## Next Steps

1. Deploy Lambda functions
2. Configure Cognito Post-Confirmation trigger
3. Set up API Gateway endpoints
4. Configure Stripe webhook endpoint
5. Test end-to-end flow
6. Update Next.js middleware to call entitlements API

