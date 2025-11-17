#!/bin/bash
# Bash script to package Stripe Webhook Lambda with dependencies
# Run this from the backend/auth_billing directory

echo "📦 Packaging Stripe Webhook Lambda..."

# Clean up old zip files
if [ -f "stripe_webhook.zip" ]; then
    rm -f stripe_webhook.zip
    echo "✅ Removed old stripe_webhook.zip"
fi

# Create a temporary directory for packaging
TEMP_DIR="temp_package_stripe"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "📋 Copying Lambda function files..."

# Copy the Lambda function file
cp stripe_webhook_lambda.py "$TEMP_DIR/"

# Copy required modules
cp config.py "$TEMP_DIR/"
cp ddb.py "$TEMP_DIR/"
cp utils.py "$TEMP_DIR/"

echo "📋 Installing dependencies (this ensures all transitive dependencies are included)..."

# Install stripe with all its dependencies (this will include typing_extensions, etc.)
pip install stripe -t "$TEMP_DIR" --quiet
echo "✅ Installed stripe and all dependencies"

echo "📦 Creating zip file..."

# Create zip file (exclude __pycache__ and .pyc files)
cd "$TEMP_DIR"
zip -r ../stripe_webhook.zip . -x "*.pyc" "__pycache__/*" "*.dist-info/RECORD"
cd ..

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo "✅ Successfully created stripe_webhook.zip"
echo ""
echo "📤 Next steps:"
echo "   1. Upload stripe_webhook.zip to your Lambda function"
echo "   2. Make sure handler is set to: stripe_webhook_lambda.lambda_handler"
echo "   3. Verify environment variables are set correctly"

