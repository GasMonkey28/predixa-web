# PowerShell deployment script for Predixa News Briefing Lambda function

$ErrorActionPreference = "Stop"

$FUNCTION_NAME = "predixa-news-briefing"
$REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$RUNTIME = "python3.11"
$HANDLER = "handler.lambda_handler"
$TIMEOUT = 300
$MEMORY_SIZE = 512

# Check if required environment variables are set
if (-not $env:MASSIVE_API_KEY) {
    Write-Host "Error: MASSIVE_API_KEY environment variable is not set" -ForegroundColor Red
    exit 1
}

if (-not $env:OPENAI_API_KEY) {
    Write-Host "Error: OPENAI_API_KEY environment variable is not set" -ForegroundColor Red
    exit 1
}

if (-not $env:S3_BUCKET -and -not $env:NEXT_PUBLIC_S3_BUCKET) {
    Write-Host "Error: S3_BUCKET or NEXT_PUBLIC_S3_BUCKET environment variable is not set" -ForegroundColor Red
    exit 1
}

$S3_BUCKET_VALUE = if ($env:S3_BUCKET) { $env:S3_BUCKET } else { $env:NEXT_PUBLIC_S3_BUCKET }

Write-Host "Deploying Lambda function: $FUNCTION_NAME" -ForegroundColor Green
Write-Host "Region: $REGION"
Write-Host "S3 Bucket: $S3_BUCKET_VALUE"

# Get script directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR

# Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Yellow

# Cleanup old files
if (Test-Path "package.zip") { Remove-Item "package.zip" }
if (Test-Path "package") { Remove-Item -Recurse -Force "package" }

# Create package directory
New-Item -ItemType Directory -Path "package" | Out-Null

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt -t package/ --quiet

# Copy handler
Copy-Item "handler.py" "package/"

# Create zip file
Write-Host "Creating zip file..." -ForegroundColor Yellow
Compress-Archive -Path "package\*" -DestinationPath "package.zip" -Force

# Check if function exists
Write-Host "Checking if function exists..." -ForegroundColor Yellow
$functionExists = $false
try {
    aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $functionExists = $true
    }
} catch {
    $functionExists = $false
}

if ($functionExists) {
    Write-Host "Function exists, updating..." -ForegroundColor Yellow
    
    aws lambda update-function-code `
        --function-name $FUNCTION_NAME `
        --zip-file fileb://package.zip `
        --region $REGION `
        --output json | Out-Null
    
    # Update environment variables
    aws lambda update-function-configuration `
        --function-name $FUNCTION_NAME `
        --environment "Variables={MASSIVE_API_KEY=$env:MASSIVE_API_KEY,OPENAI_API_KEY=$env:OPENAI_API_KEY,S3_BUCKET=$S3_BUCKET_VALUE,AWS_REGION=$REGION}" `
        --timeout $TIMEOUT `
        --memory-size $MEMORY_SIZE `
        --region $REGION `
        --output json | Out-Null
    
    Write-Host "✅ Function updated successfully" -ForegroundColor Green
} else {
    Write-Host "Function does not exist, creating..." -ForegroundColor Yellow
    
    # Get account ID
    $accountId = aws sts get-caller-identity --query Account --output text
    
    # Try to find or use default role
    $ROLE_ARN = if ($env:LAMBDA_ROLE_ARN) { 
        $env:LAMBDA_ROLE_ARN 
    } else { 
        "arn:aws:iam::${accountId}:role/lambda-execution-role" 
    }
    
    Write-Host "Using IAM role: $ROLE_ARN" -ForegroundColor Yellow
    Write-Host "Note: If this role doesn't exist, you'll need to create it first" -ForegroundColor Yellow
    
    # Create function
    aws lambda create-function `
        --function-name $FUNCTION_NAME `
        --runtime $RUNTIME `
        --role $ROLE_ARN `
        --handler $HANDLER `
        --zip-file fileb://package.zip `
        --timeout $TIMEOUT `
        --memory-size $MEMORY_SIZE `
        --environment "Variables={MASSIVE_API_KEY=$env:MASSIVE_API_KEY,OPENAI_API_KEY=$env:OPENAI_API_KEY,S3_BUCKET=$S3_BUCKET_VALUE,AWS_REGION=$REGION}" `
        --region $REGION `
        --output json | Out-Null
    
    Write-Host "✅ Function created successfully" -ForegroundColor Green
}

# Cleanup
Remove-Item -Recurse -Force "package"
Write-Host "✅ Deployment complete!" -ForegroundColor Green

# Display function info
Write-Host ""
Write-Host "Function details:" -ForegroundColor Cyan
aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.[FunctionName,Runtime,LastModified,MemorySize,Timeout]' --output table

Write-Host ""
Write-Host "To test the function:" -ForegroundColor Cyan
Write-Host "aws lambda invoke --function-name $FUNCTION_NAME --region $REGION --payload '{}' response.json"

