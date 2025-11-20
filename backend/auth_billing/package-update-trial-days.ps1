# PowerShell script to package Update Trial Days Lambda
# Run this from the backend/auth_billing directory

Write-Host "📦 Packaging Update Trial Days Lambda..." -ForegroundColor Cyan

# Clean up old zip files
if (Test-Path "update_trial_days.zip") {
    Remove-Item "update_trial_days.zip" -Force
    Write-Host "✅ Removed old update_trial_days.zip" -ForegroundColor Green
}

# Create a temporary directory for packaging
$tempDir = "temp_package_trial_days"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "📋 Copying Lambda function file..." -ForegroundColor Yellow

# Copy the standalone Lambda function file (self-contained, no dependencies needed)
# Rename it to lambda_function.py for Lambda handler
Copy-Item "update_trial_days_lambda_standalone.py" -Destination "$tempDir\lambda_function.py"

Write-Host "✅ Copied lambda function" -ForegroundColor Green

Write-Host "📦 Creating zip file..." -ForegroundColor Yellow

# Create zip file
Compress-Archive -Path "$tempDir\*" -DestinationPath "update_trial_days.zip" -Force

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

Write-Host "✅ Successfully created update_trial_days.zip" -ForegroundColor Green
Write-Host ""
Write-Host "📤 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Upload update_trial_days.zip to your Lambda function" -ForegroundColor White
Write-Host "   2. Make sure handler is set to: lambda_function.lambda_handler" -ForegroundColor White
Write-Host "   3. Set environment variables:" -ForegroundColor White
Write-Host "      - ENTITLEMENTS_TABLE = predixa_entitlements" -ForegroundColor White
Write-Host "      - AWS_REGION = us-east-1 (optional)" -ForegroundColor White
Write-Host "   4. Set timeout to 5 minutes" -ForegroundColor White
Write-Host "   5. Verify IAM role has dynamodb:Scan permission" -ForegroundColor White
