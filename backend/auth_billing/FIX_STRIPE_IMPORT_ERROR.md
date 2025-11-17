# Fix: "No module named 'stripe'" Lambda Error

## Problem
The Lambda function can't find the `stripe` module because dependencies aren't packaged correctly.

## Solution: Repackage the Lambda

The dependencies need to be at the **root** of the zip file, not in a subdirectory.

### Option 1: Use the Packaging Script (Recommended)

**Windows PowerShell:**
```powershell
cd backend\auth_billing
.\package-stripe-webhook.ps1
```

**Linux/Mac:**
```bash
cd backend/auth_billing
chmod +x package-stripe-webhook.sh
./package-stripe-webhook.sh
```

### Option 2: Manual Packaging

**Windows PowerShell:**
```powershell
cd backend\auth_billing

# Create temp directory
$temp = "lambda_package"
Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy Lambda file
Copy-Item stripe_webhook_lambda.py $temp\

# Copy required modules
Copy-Item config.py, ddb.py, utils.py $temp\

# Copy stripe from package directory (or install fresh)
if (Test-Path "package\stripe") {
    Copy-Item package\stripe $temp\ -Recurse
    Copy-Item package\stripe-*.dist-info $temp\ -Recurse
} else {
    pip install stripe -t $temp
}

# Create zip
Compress-Archive -Path "$temp\*" -DestinationPath stripe_webhook.zip -Force

# Cleanup
Remove-Item $temp -Recurse -Force
```

**Linux/Mac:**
```bash
cd backend/auth_billing

# Create temp directory
TEMP_DIR="lambda_package"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy Lambda file
cp stripe_webhook_lambda.py "$TEMP_DIR/"

# Copy required modules
cp config.py ddb.py utils.py "$TEMP_DIR/"

# Copy stripe from package directory (or install fresh)
if [ -d "package/stripe" ]; then
    cp -r package/stripe "$TEMP_DIR/"
    cp -r package/stripe-*.dist-info "$TEMP_DIR/"
else
    pip install stripe -t "$TEMP_DIR"
fi

# Create zip (exclude __pycache__)
cd "$TEMP_DIR"
zip -r ../stripe_webhook.zip . -x "*.pyc" "__pycache__/*"
cd ..
rm -rf "$TEMP_DIR"
```

### Option 3: Install Dependencies Fresh (Recommended)

This ensures all transitive dependencies (like `typing_extensions`) are included:

**Windows PowerShell:**
```powershell
cd backend\auth_billing

# Create clean package directory
$temp = "lambda_package"
Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $temp | Out-Null

# Install stripe with ALL dependencies (includes typing_extensions, etc.)
pip install stripe -t $temp --quiet

# Copy Lambda files
Copy-Item stripe_webhook_lambda.py, config.py, ddb.py, utils.py $temp\

# Create zip
Compress-Archive -Path "$temp\*" -DestinationPath stripe_webhook.zip -Force

# Cleanup
Remove-Item $temp -Recurse -Force
```

**Linux/Mac:**
```bash
cd backend/auth_billing

# Create clean package directory
TEMP_DIR="lambda_package"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Install stripe with ALL dependencies (includes typing_extensions, etc.)
pip install stripe -t "$TEMP_DIR" --quiet

# Copy Lambda files
cp stripe_webhook_lambda.py config.py ddb.py utils.py "$TEMP_DIR/"

# Create zip (exclude __pycache__)
cd "$TEMP_DIR"
zip -r ../stripe_webhook.zip . -x "*.pyc" "__pycache__/*"
cd ..
rm -rf "$TEMP_DIR"
```

## Upload to Lambda

1. Go to AWS Lambda Console
2. Select your `predixa-stripe-webhook` function
3. Click **Code** tab
4. Click **Upload from** → **.zip file**
5. Select `stripe_webhook.zip`
6. Click **Save**

## Verify Handler

Make sure the handler is set to:
```
stripe_webhook_lambda.lambda_handler
```

## Test

After uploading, test the Lambda function. The import error should be resolved.

## Why This Happens

Lambda unpacks your zip file and looks for modules at the root level. If your dependencies are in a `package/` subdirectory, Python can't find them. The solution is to put all dependencies at the root of the zip file.

