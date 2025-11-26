# Quick Deploy Guide

## Step 1: Set Environment Variables

Open PowerShell and set these variables (replace with your actual values):

```powershell
$env:MASSIVE_API_KEY = "your-massive-api-key"
$env:OPENAI_API_KEY = "your-openai-api-key"
$env:S3_BUCKET = "your-s3-bucket-name"  # or use NEXT_PUBLIC_S3_BUCKET
$env:AWS_REGION = "us-east-1"
```

**OR** if you have a `.env.local` file, you can load it:
```powershell
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        Set-Item -Path "env:$name" -Value $value
    }
}
```

## Step 2: Check IAM Role

The Lambda function needs an IAM role. Check if you have one:

```powershell
aws iam get-role --role-name lambda-execution-role
```

If it doesn't exist, you'll need to create it or use an existing role. The role needs:
- S3 permissions: `PutObject`, `GetObject` on `briefings/*`
- Lambda execution permissions

## Step 3: Deploy

Run the PowerShell deployment script:

```powershell
cd lambda/news-briefing
.\deploy.ps1
```

## Step 4: Test

After deployment, test the function:

```powershell
aws lambda invoke --function-name predixa-news-briefing --region us-east-1 --payload '{}' response.json
Get-Content response.json
```

## Troubleshooting

### Missing IAM Role
If you get an error about the IAM role, you can:
1. Create a new role with the required permissions
2. Or set `$env:LAMBDA_ROLE_ARN` to an existing role ARN before deploying

### Missing Environment Variables
Make sure all required variables are set:
- `MASSIVE_API_KEY`
- `OPENAI_API_KEY`
- `S3_BUCKET` or `NEXT_PUBLIC_S3_BUCKET`

