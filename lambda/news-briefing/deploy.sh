#!/bin/bash
# Deployment script for Predixa News Briefing Lambda function

set -e

FUNCTION_NAME="predixa-news-briefing"
REGION="${AWS_REGION:-us-east-1}"
RUNTIME="python3.11"
HANDLER="handler.lambda_handler"
TIMEOUT=300
MEMORY_SIZE=512

# Check if required environment variables are set
if [ -z "$MASSIVE_API_KEY" ]; then
    echo "Error: MASSIVE_API_KEY environment variable is not set"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable is not set"
    exit 1
fi

if [ -z "$S3_BUCKET" ] && [ -z "$NEXT_PUBLIC_S3_BUCKET" ]; then
    echo "Error: S3_BUCKET or NEXT_PUBLIC_S3_BUCKET environment variable is not set"
    exit 1
fi

S3_BUCKET_VALUE="${S3_BUCKET:-$NEXT_PUBLIC_S3_BUCKET}"

echo "Deploying Lambda function: $FUNCTION_NAME"
echo "Region: $REGION"
echo "S3 Bucket: $S3_BUCKET_VALUE"

# Create deployment package
echo "Creating deployment package..."
cd "$(dirname "$0")"
rm -rf package.zip
rm -rf package/

# Create package directory
mkdir -p package

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt -t package/ --quiet

# Copy handler
cp handler.py package/

# Create zip file
cd package
zip -r ../package.zip . -q
cd ..

# Check if function exists
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
    echo "Function exists, updating..."
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://package.zip \
        --region "$REGION" \
        --output json > /dev/null
    
    # Update environment variables
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --environment "Variables={MASSIVE_API_KEY=$MASSIVE_API_KEY,OPENAI_API_KEY=$OPENAI_API_KEY,S3_BUCKET=$S3_BUCKET_VALUE,AWS_REGION=$REGION}" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --region "$REGION" \
        --output json > /dev/null
    
    echo "✅ Function updated successfully"
else
    echo "Function does not exist, creating..."
    
    # Get or create IAM role (you may need to adjust this)
    ROLE_ARN="${LAMBDA_ROLE_ARN:-arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role}"
    
    # Create function
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --role "$ROLE_ARN" \
        --handler "$HANDLER" \
        --zip-file fileb://package.zip \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --environment "Variables={MASSIVE_API_KEY=$MASSIVE_API_KEY,OPENAI_API_KEY=$OPENAI_API_KEY,S3_BUCKET=$S3_BUCKET_VALUE,AWS_REGION=$REGION}" \
        --region "$REGION" \
        --output json > /dev/null
    
    echo "✅ Function created successfully"
fi

# Cleanup
rm -rf package/
echo "✅ Deployment complete!"

# Display function info
echo ""
echo "Function details:"
aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Configuration.[FunctionName,Runtime,LastModified,MemorySize,Timeout]' --output table

echo ""
echo "To test the function:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --region $REGION --payload '{}' response.json"

