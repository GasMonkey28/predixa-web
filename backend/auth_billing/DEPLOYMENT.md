# Quick Deployment Guide

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. DynamoDB tables created (see README.md)
3. Stripe account with API keys
4. Cognito User Pool configured

## Step-by-Step Deployment

### 1. Package Lambda Functions

```bash
cd backend/auth_billing

# Install dependencies
pip install -r requirements.txt -t .

# Create deployment package (exclude unnecessary files)
zip -r post_confirmation.zip . \
  -x "*.pyc" "__pycache__/*" "*.git*" "*.md" "*.txt" \
  -x "stripe_webhook_lambda.py" "entitlements_api_lambda.py"

zip -r stripe_webhook.zip . \
  -x "*.pyc" "__pycache__/*" "*.git*" "*.md" "*.txt" \
  -x "post_confirmation_lambda.py" "entitlements_api_lambda.py"

zip -r entitlements_api.zip . \
  -x "*.pyc" "__pycache__/*" "*.git*" "*.md" "*.txt" \
  -x "post_confirmation_lambda.py" "stripe_webhook_lambda.py" "delete_user_lambda.py"

zip -r delete_user_api.zip . \
  -x "*.pyc" "__pycache__/*" "*.git*" "*.md" "*.txt" \
  -x "post_confirmation_lambda.py" "stripe_webhook_lambda.py" "entitlements_api_lambda.py" \
  -x "delete_user.py" "find_duplicate_users.py"
```

### 2. Create IAM Role

```bash
# Create execution role (one-time)
aws iam create-role \
  --role-name predixa-lambda-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name predixa-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Add DynamoDB permissions (create custom policy)
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

# Add Cognito permissions for delete user function
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

### 3. Deploy Post-Confirmation Lambda

```bash
# Create function
aws lambda create-function \
  --function-name predixa-post-confirmation \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/predixa-lambda-execution-role \
  --handler post_confirmation_lambda.lambda_handler \
  --zip-file fileb://post_confirmation.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx}"

# Add Cognito trigger (replace USER_POOL_ID)
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX \
  --lambda-config PostConfirmation=arn:aws:lambda:us-east-1:ACCOUNT_ID:function:predixa-post-confirmation
```

### 4. Deploy Stripe Webhook Lambda

```bash
# Create function
aws lambda create-function \
  --function-name predixa-stripe-webhook \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/predixa-lambda-execution-role \
  --handler stripe_webhook_lambda.lambda_handler \
  --zip-file fileb://stripe_webhook.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx,STRIPE_WEBHOOK_SECRET=whsec_xxx}"

# Create API Gateway (REST API)
aws apigateway create-rest-api --name predixa-stripe-webhook

# Follow API Gateway setup to create POST /stripe/webhook endpoint
# Point it to predixa-stripe-webhook Lambda
```

### 5. Deploy Entitlements API Lambda

```bash
# Create function
aws lambda create-function \
  --function-name predixa-entitlements-api \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/predixa-lambda-execution-role \
  --handler entitlements_api_lambda.lambda_handler \
  --zip-file fileb://entitlements_api.zip \
  --timeout 10 \
  --memory-size 128 \
  --environment Variables="{AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements}"

# Create API Gateway endpoint GET /me/entitlements
# Configure Cognito Authorizer:
#   - Type: Cognito User Pool
#   - User Pool: Your Cognito User Pool ID
#   - Token Source: Authorization
```

### 6. Deploy Delete User API Lambda

```bash
# Create function
aws lambda create-function \
  --function-name predixa-delete-user-api \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/predixa-lambda-execution-role \
  --handler delete_user_lambda.lambda_handler \
  --zip-file fileb://delete_user_api.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx,COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX}"

# Create API Gateway endpoint DELETE /me/account
# Configure Cognito Authorizer:
#   - Type: Cognito User Pool
#   - User Pool: Your Cognito User Pool ID
#   - Token Source: Authorization
```

### 7. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://YOUR_API_GATEWAY_URL/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret
5. Update Lambda environment variable: `STRIPE_WEBHOOK_SECRET`

### 7. Test

```bash
# Test Post-Confirmation: Sign up a new user
# Check CloudWatch Logs for Lambda execution

# Test Webhook: Use Stripe Dashboard → Send test webhook
# Check CloudWatch Logs for processing

# Test Entitlements API:
curl -X GET https://YOUR_API_GATEWAY_URL/me/entitlements \
  -H "Authorization: Bearer YOUR_COGNITO_JWT"

# Test Delete User API:
curl -X DELETE https://YOUR_API_GATEWAY_URL/me/account \
  -H "Authorization: Bearer YOUR_COGNITO_JWT"
```

## Updating Functions

```bash
# Update code
zip -r function.zip . -x "*.pyc" "__pycache__/*"

# Update Lambda
aws lambda update-function-code \
  --function-name predixa-post-confirmation \
  --zip-file fileb://function.zip
```

## Troubleshooting

- **Check CloudWatch Logs**: Each Lambda has its own log group
- **Verify IAM Permissions**: Lambda role needs DynamoDB access
- **Check Environment Variables**: All required vars must be set
- **Test Locally**: Use `python lambda_file.py test` before deploying

