# PowerShell script to deploy delete_user_lambda.py to AWS Lambda
# 
# BEFORE RUNNING:
# 1. Replace ACCOUNT_ID with your AWS account ID
# 2. Replace us-east-1 with your AWS region if different
# 3. Replace sk_live_xxx with your actual Stripe secret key
# 4. Replace us-east-1_XXXXXXXXX with your actual Cognito User Pool ID
# 5. Make sure you're in the backend/auth_billing directory
# 6. Make sure delete_user_api.zip exists

$ACCOUNT_ID = "YOUR_ACCOUNT_ID"  # Replace this!
$REGION = "us-east-1"  # Replace if different
$STRIPE_KEY = "sk_live_xxx"  # Replace with your Stripe key
$COGNITO_POOL_ID = "us-east-1_XXXXXXXXX"  # Replace with your Cognito User Pool ID

Write-Host "Deploying delete_user_lambda to AWS Lambda..." -ForegroundColor Green
Write-Host ""

# Check if ZIP file exists
if (-not (Test-Path "delete_user_api.zip")) {
    Write-Host "ERROR: delete_user_api.zip not found!" -ForegroundColor Red
    Write-Host "Please create the ZIP file first." -ForegroundColor Red
    exit 1
}

Write-Host "ZIP file found: delete_user_api.zip" -ForegroundColor Green
Write-Host ""

# Deploy Lambda function
aws lambda create-function `
    --function-name predixa-delete-user-api `
    --runtime python3.11 `
    --role "arn:aws:iam::${ACCOUNT_ID}:role/predixa-lambda-execution-role" `
    --handler delete_user_lambda.lambda_handler `
    --zip-file fileb://delete_user_api.zip `
    --timeout 30 `
    --memory-size 256 `
    --environment "Variables={AWS_REGION=${REGION},USERS_TABLE=UserProfiles,ENTITLEMENTS_TABLE=predixa_entitlements,STRIPE_API_KEY=${STRIPE_KEY},COGNITO_USER_POOL_ID=${COGNITO_POOL_ID}}"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Lambda function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Create API Gateway endpoint: DELETE /me/account" -ForegroundColor Yellow
    Write-Host "2. Configure Cognito Authorizer on the endpoint" -ForegroundColor Yellow
    Write-Host "3. Test the endpoint" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the error above." -ForegroundColor Red
}


