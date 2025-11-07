# Quick Lambda Deployment Guide

## Prerequisites

1. AWS CLI installed and configured: `aws configure`
2. Python 3.11 installed locally
3. DynamoDB tables created (see README.md)

## Step 1: Package Lambda Functions

```bash
# Navigate to the auth_billing directory
cd backend/auth_billing

# Install dependencies locally (creates a package directory)
pip install -r requirements.txt -t package/

# Copy your Lambda code to the package
cp -r *.py package/ 2>/dev/null || copy *.py package\  # Windows: use copy instead of cp

# Create deployment packages
cd package
zip -r ../post_confirmation.zip . -x "*.pyc" "__pycache__/*"
zip -r ../stripe_webhook.zip . -x "*.pyc" "__pycache__/*"
zip -r ../entitlements_api.zip . -x "*.pyc" "__pycache__/*"
cd ..
```

**Windows PowerShell alternative:**
```powershell
cd backend\auth_billing

# Install dependencies
pip install -r requirements.txt -t package

# Copy Python files
Copy-Item *.py package\

# Create zip files (requires 7-Zip or use AWS CLI)
Compress-Archive -Path package\* -DestinationPath post_confirmation.zip
Compress-Archive -Path package\* -DestinationPath stripe_webhook.zip
Compress-Archive -Path package\* -DestinationPath entitlements_api.zip
```

## Step 2: Create IAM Role (One-Time Setup)

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

# Create execution role
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

# Attach basic execution policy
aws iam attach-role-policy \
  --role-name predixa-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create and attach DynamoDB policy
cat > /tmp/dynamodb-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem"
    ],
    "Resource": [
      "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/UserProfiles",
      "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/predixa_entitlements"
    ]
  }]
}
EOF

aws iam put-role-policy \
  --role-name predixa-lambda-execution-role \
  --policy-name DynamoDBAccess \
  --policy-document file:///tmp/dynamodb-policy.json

# Get the role ARN (you'll need this)
ROLE_ARN=$(aws iam get-role --role-name predixa-lambda-execution-role --query 'Role.Arn' --output text)
echo "Role ARN: $ROLE_ARN"
```

## Step 3: Deploy Post-Confirmation Lambda

```bash
# Replace ACCOUNT_ID and ROLE_ARN with your values
ACCOUNT_ID="YOUR_ACCOUNT_ID"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/predixa-lambda-execution-role"

# Create function
aws lambda create-function \
  --function-name predixa-post-confirmation \
  --runtime python3.11 \
  --role "$ROLE_ARN" \
  --handler post_confirmation_lambda.lambda_handler \
  --zip-file fileb://post_confirmation.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx}"

# Add Cognito trigger (replace USER_POOL_ID)
USER_POOL_ID="us-east-1_XXXXXXXXX"
aws cognito-idp update-user-pool \
  --user-pool-id "$USER_POOL_ID" \
  --lambda-config "PostConfirmation=arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:predixa-post-confirmation"
```

## Step 4: Deploy Stripe Webhook Lambda

```bash
# Create function
aws lambda create-function \
  --function-name predixa-stripe-webhook \
  --runtime python3.11 \
  --role "$ROLE_ARN" \
  --handler stripe_webhook_lambda.lambda_handler \
  --zip-file fileb://stripe_webhook.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx,STRIPE_WEBHOOK_SECRET=whsec_xxx}"

# Note: You'll need to create API Gateway endpoint separately (see Step 6)
```

## Step 5: Deploy Entitlements API Lambda

```bash
# Create function
aws lambda create-function \
  --function-name predixa-entitlements-api \
  --runtime python3.11 \
  --role "$ROLE_ARN" \
  --handler entitlements_api_lambda.lambda_handler \
  --zip-file fileb://entitlements_api.zip \
  --timeout 10 \
  --memory-size 128 \
  --environment "Variables={AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements}"

# Note: You'll need to create API Gateway endpoint with Cognito Authorizer (see Step 7)
```

## Step 6: Create API Gateway for Webhook

```bash
# Create REST API
API_ID=$(aws apigateway create-rest-api \
  --name predixa-stripe-webhook \
  --query 'id' \
  --output text)

echo "API ID: $API_ID"

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --query 'items[0].id' \
  --output text)

# Create /stripe resource
STRIPE_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id "$API_ID" \
  --parent-id "$ROOT_ID" \
  --path-part stripe \
  --query 'id' \
  --output text)

# Create /stripe/webhook resource
WEBHOOK_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id "$API_ID" \
  --parent-id "$STRIPE_RESOURCE_ID" \
  --path-part webhook \
  --query 'id' \
  --output text)

# Create POST method
aws apigateway put-method \
  --rest-api-id "$API_ID" \
  --resource-id "$WEBHOOK_RESOURCE_ID" \
  --http-method POST \
  --authorization-type NONE

# Set Lambda integration
aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$WEBHOOK_RESOURCE_ID" \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:predixa-stripe-webhook/invocations"

# Deploy to stage
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name prod

# Get the webhook URL
WEBHOOK_URL="https://${API_ID}.execute-api.us-east-1.amazonaws.com/prod/stripe/webhook"
echo "Webhook URL: $WEBHOOK_URL"
echo "Add this URL to Stripe Dashboard → Webhooks"
```

## Step 7: Create API Gateway for Entitlements API

```bash
# Create REST API
ENT_API_ID=$(aws apigateway create-rest-api \
  --name predixa-entitlements-api \
  --query 'id' \
  --output text)

echo "Entitlements API ID: $ENT_API_ID"

# Get root resource ID
ENT_ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id "$ENT_API_ID" \
  --query 'items[0].id' \
  --output text)

# Create /me resource
ME_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id "$ENT_API_ID" \
  --parent-id "$ENT_ROOT_ID" \
  --path-part me \
  --query 'id' \
  --output text)

# Create /me/entitlements resource
ENT_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id "$ENT_API_ID" \
  --parent-id "$ME_RESOURCE_ID" \
  --path-part entitlements \
  --query 'id' \
  --output text)

# Create GET method with Cognito Authorizer
USER_POOL_ID="us-east-1_XXXXXXXXX"
COGNITO_ARN="arn:aws:cognito-idp:us-east-1:${ACCOUNT_ID}:userpool/${USER_POOL_ID}"

# Create Cognito Authorizer
AUTHORIZER_ID=$(aws apigateway create-authorizer \
  --rest-api-id "$ENT_API_ID" \
  --name CognitoAuthorizer \
  --type COGNITO_USER_POOLS \
  --provider-arns "$COGNITO_ARN" \
  --identity-source method.request.header.Authorization \
  --query 'id' \
  --output text)

# Create GET method
aws apigateway put-method \
  --rest-api-id "$ENT_API_ID" \
  --resource-id "$ENT_RESOURCE_ID" \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id "$AUTHORIZER_ID"

# Set Lambda integration
aws apigateway put-integration \
  --rest-api-id "$ENT_API_ID" \
  --resource-id "$ENT_RESOURCE_ID" \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:predixa-entitlements-api/invocations"

# Deploy to stage
aws apigateway create-deployment \
  --rest-api-id "$ENT_API_ID" \
  --stage-name prod

# Get the entitlements API URL
ENTITLEMENTS_URL="https://${ENT_API_ID}.execute-api.us-east-1.amazonaws.com/prod/me/entitlements"
echo "Entitlements API URL: $ENTITLEMENTS_URL"
echo "Add this to Vercel environment variables as ENTITLEMENTS_API_GATEWAY_URL"
```

## Step 8: Update Lambda Environment Variables

If you need to update environment variables later:

```bash
# Post-Confirmation
aws lambda update-function-configuration \
  --function-name predixa-post-confirmation \
  --environment "Variables={AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx}"

# Stripe Webhook
aws lambda update-function-configuration \
  --function-name predixa-stripe-webhook \
  --environment "Variables={AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=sk_live_xxx,STRIPE_WEBHOOK_SECRET=whsec_xxx}"

# Entitlements API
aws lambda update-function-configuration \
  --function-name predixa-entitlements-api \
  --environment "Variables={AWS_REGION=us-east-1,USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements}"
```

## Step 9: Add Environment Variable to Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `ENTITLEMENTS_API_GATEWAY_URL`
   - **Value**: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements`
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**
5. **Redeploy** your application for changes to take effect

## Troubleshooting

### Lambda deployment fails
- Check AWS CLI credentials: `aws sts get-caller-identity`
- Verify IAM role exists: `aws iam get-role --role-name predixa-lambda-execution-role`
- Check zip file size (must be < 50MB for direct upload)

### API Gateway 403 Forbidden
- Check Lambda permissions: API Gateway needs permission to invoke Lambda
- Run: `aws lambda add-permission --function-name predixa-entitlements-api --statement-id apigateway-invoke --action lambda:InvokeFunction --principal apigateway.amazonaws.com`

### Cognito Authorizer not working
- Verify User Pool ID is correct
- Check that API Gateway authorizer is using correct User Pool ARN
- Test JWT token manually in API Gateway console

## Next Steps

1. ✅ Deploy all Lambda functions
2. ✅ Create API Gateway endpoints
3. ✅ Add `ENTITLEMENTS_API_GATEWAY_URL` to Vercel
4. ✅ Configure Stripe webhook endpoint
5. ✅ Test end-to-end flow

