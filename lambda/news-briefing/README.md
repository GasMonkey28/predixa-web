# Predixa News Briefing Lambda Function

AWS Lambda function that generates SPY news briefings using OpenAI and stores them in S3.

## Overview

This Lambda function:
1. Fetches SPY news from Massive.com API
2. Generates AI-powered briefings using OpenAI (3 modes: pro, simple, wsb)
3. Stores results in S3 for consumption by web and iOS apps

## Prerequisites

- AWS CLI configured with appropriate credentials
- Python 3.11
- IAM role with permissions:
  - S3: `PutObject`, `GetObject` on `briefings/*` prefix
  - Lambda execution permissions

## Environment Variables

Set these in your Lambda function configuration:

- `MASSIVE_API_KEY` - Massive.com API key
- `OPENAI_API_KEY` - OpenAI API key
- `S3_BUCKET` - S3 bucket name (or `NEXT_PUBLIC_S3_BUCKET`)
- `AWS_REGION` - AWS region (default: us-east-1)

## Deployment

### Option 1: Using the deployment script

```bash
cd lambda/news-briefing

# Set environment variables
export MASSIVE_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export S3_BUCKET="your-bucket-name"
export AWS_REGION="us-east-1"

# Make script executable
chmod +x deploy.sh

# Deploy
./deploy.sh
```

### Option 2: Manual deployment

1. Install dependencies:
```bash
pip install -r requirements.txt -t package/
```

2. Copy handler:
```bash
cp handler.py package/
```

3. Create zip:
```bash
cd package
zip -r ../package.zip .
cd ..
```

4. Create/update Lambda function:
```bash
aws lambda create-function \
  --function-name predixa-news-briefing \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT:role/lambda-execution-role \
  --handler handler.lambda_handler \
  --zip-file fileb://package.zip \
  --timeout 300 \
  --memory-size 512 \
  --environment Variables="{MASSIVE_API_KEY=...,OPENAI_API_KEY=...,S3_BUCKET=...,AWS_REGION=us-east-1}"
```

## Testing

Test the function manually:

```bash
aws lambda invoke \
  --function-name predixa-news-briefing \
  --payload '{}' \
  response.json

cat response.json
```

Test with specific mode:

```bash
aws lambda invoke \
  --function-name predixa-news-briefing \
  --payload '{"modes": ["pro"]}' \
  response.json
```

## EventBridge Schedule

The Lambda runs on an optimized schedule based on market hours:

- **Pre-market** (1 hour before): 13:30 UTC (8:30 AM ET)
- **Market hours** (9:30 AM - 4:00 PM ET): Every 30 minutes from 14:00-20:30 UTC
- **Market close**: 21:00 UTC (4:00 PM ET)
- **Post-market** (1 hour after): 22:00 UTC (5:00 PM ET)
- **Off-hours**: Every 3 hours

**Total runs per day:** ~21 runs/day (~630/month)

### Setup

Use the setup script to configure all schedules automatically:

**Linux/WSL:**
```bash
chmod +x setup-schedule.sh
./setup-schedule.sh
```

**Windows PowerShell:**
```powershell
.\setup-schedule.ps1
```

The script creates 5 EventBridge rules:
- `predixa-briefing-pre-market` - Pre-market briefing
- `predixa-briefing-market-hours` - Every 30 min during market hours
- `predixa-briefing-market-close` - Market close briefing
- `predixa-briefing-post-market` - Post-market briefing
- `predixa-briefing-off-hours` - Off-hours (every 3 hours)

## S3 Structure

The function stores briefings in S3 with this structure:

```
s3://{bucket}/
  briefings/
    spy/
      latest-pro.json
      latest-simple.json
      latest-wsb.json
      YYYY-MM-DD/
        pro.json
        simple.json
        wsb.json
```

Each file contains:
```json
{
  "briefing": {
    "daily_brief": [...],
    "themes": [...],
    "sentiment": "bullish|bearish|mixed|neutral",
    "top_articles": [...]
  },
  "mode": "pro|simple|wsb",
  "articlesCount": 20,
  "articleHash": "...",
  "generatedAt": "2025-01-15T10:30:00Z",
  "date": "2025-01-15"
}
```

## Monitoring

Check CloudWatch logs:

```bash
aws logs tail /aws/lambda/predixa-news-briefing --follow
```

## Troubleshooting

### Function times out
- Increase timeout (max 900 seconds)
- Increase memory size (may improve performance)

### S3 access denied
- Check IAM role has S3 permissions
- Verify bucket name is correct
- Check bucket policy allows Lambda role

### OpenAI API errors
- Verify API key is correct
- Check API quota/limits
- Review error messages in CloudWatch logs

### No articles returned
- Check Massive.com API key
- Verify API is accessible
- Check rate limits

