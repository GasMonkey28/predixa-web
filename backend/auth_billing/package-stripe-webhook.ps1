# PowerShell script to package Stripe Webhook Lambda with dependencies
# Run this from the backend/auth_billing directory

Write-Host "📦 Packaging Stripe Webhook Lambda..." -ForegroundColor Cyan

# Clean up old zip files
if (Test-Path "stripe_webhook.zip") {
    Remove-Item "stripe_webhook.zip" -Force
    Write-Host "✅ Removed old stripe_webhook.zip" -ForegroundColor Green
}

# Create a temporary directory for packaging
$tempDir = "temp_package_stripe"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "📋 Copying Lambda function files..." -ForegroundColor Yellow

# Copy the Lambda function file
Copy-Item "stripe_webhook_lambda.py" -Destination $tempDir

# Copy required modules
Copy-Item "config.py" -Destination $tempDir
Copy-Item "ddb.py" -Destination $tempDir
Copy-Item "utils.py" -Destination $tempDir

Write-Host "📋 Installing dependencies (this ensures all transitive dependencies are included)..." -ForegroundColor Yellow

# Install stripe with all its dependencies (this will include typing_extensions, etc.)
pip install stripe -t $tempDir --quiet
Write-Host "✅ Installed stripe and all dependencies" -ForegroundColor Green

Write-Host "📦 Creating zip file..." -ForegroundColor Yellow

# Create zip file
Compress-Archive -Path "$tempDir\*" -DestinationPath "stripe_webhook.zip" -Force

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

Write-Host "✅ Successfully created stripe_webhook.zip" -ForegroundColor Green
Write-Host ""
Write-Host "📤 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Upload stripe_webhook.zip to your Lambda function" -ForegroundColor White
Write-Host "   2. Make sure handler is set to: stripe_webhook_lambda.lambda_handler" -ForegroundColor White
Write-Host "   3. Verify environment variables are set correctly" -ForegroundColor White

