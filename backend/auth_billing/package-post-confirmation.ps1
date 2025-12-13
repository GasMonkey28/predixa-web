# PowerShell script to package Post Confirmation Lambda with dependencies
# Run this from the backend/auth_billing directory

Write-Host "📦 Packaging Post Confirmation Lambda..." -ForegroundColor Cyan

# Clean up old zip files
if (Test-Path "post_confirmation.zip") {
    Remove-Item "post_confirmation.zip" -Force
    Write-Host "✅ Removed old post_confirmation.zip" -ForegroundColor Green
}

Write-Host "📋 Using package folder (already contains updated config.py with TRIAL_DAYS=7)..." -ForegroundColor Yellow

# Verify package folder exists
if (-not (Test-Path "package")) {
    Write-Host "❌ Error: package folder not found!" -ForegroundColor Red
    Write-Host "   Please run: pip install -r requirements.txt -t package" -ForegroundColor Yellow
    exit 1
}

# Verify config.py has the updated value
$configContent = Get-Content "package\config.py" -Raw
if ($configContent -match 'TRIAL_DAYS = int\(os\.getenv\("TRIAL_DAYS", "7"\)\)') {
    Write-Host "✅ Verified: package/config.py has TRIAL_DAYS=7" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: package/config.py may not have TRIAL_DAYS=7" -ForegroundColor Yellow
    Write-Host "   Please verify the config.py file" -ForegroundColor Yellow
}

Write-Host "📦 Creating zip file from package folder..." -ForegroundColor Yellow

# Create zip file from package folder
Compress-Archive -Path "package\*" -DestinationPath "post_confirmation.zip" -Force

Write-Host "✅ Successfully created post_confirmation.zip" -ForegroundColor Green
Write-Host ""
Write-Host "📤 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Go to AWS Lambda Console → predixa-post-confirmation" -ForegroundColor White
Write-Host "   2. Code tab → Upload from → .zip file" -ForegroundColor White
Write-Host "   3. Select post_confirmation.zip" -ForegroundColor White
Write-Host "   4. Click Save" -ForegroundColor White
Write-Host "   5. Verify handler is: post_confirmation_lambda.lambda_handler" -ForegroundColor White
Write-Host ""
Write-Host "✨ New signups will now get 7 days free trial!" -ForegroundColor Green






