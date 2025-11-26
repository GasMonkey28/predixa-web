# News Briefing Lambda + S3 Implementation Summary

## ✅ Completed: Phase 1 & 2 (Lambda + Website)

### Lambda Function Created

**Location:** `lambda/news-briefing/`

- ✅ `handler.py` - Lambda function that:
  - Fetches SPY news from Massive.com API
  - Generates briefings using OpenAI (all 3 modes: pro, simple, wsb)
  - Stores results in S3 at `briefings/spy/latest-{mode}.json` and dated versions
  - Includes metadata (timestamp, article count, article hash)

- ✅ `requirements.txt` - Python dependencies (boto3, openai, requests)

- ✅ `deploy.sh` - Deployment script for Lambda function

- ✅ `setup-schedule.sh` - Script to set up EventBridge schedule

- ✅ `README.md` - Documentation for Lambda function

- ✅ `DEPLOYMENT_GUIDE.md` - Step-by-step deployment guide

### Website Updates

**Location:** `src/`

- ✅ `lib/s3-briefing-client.ts` - Utility to read briefings from S3
  - Functions: `readBriefingFromS3()`, `getFreshBriefingFromS3()`, `isBriefingFresh()`
  - Handles freshness checks and fallback logic

- ✅ `app/api/news/briefing/route.ts` - Updated API route
  - **Priority 1:** Read from S3 (if fresh)
  - **Priority 2:** Check in-memory cache
  - **Priority 3:** Generate new briefing (fallback)
  - Returns source information in response headers

## 📋 Next Steps

### 1. Deploy Lambda Function

```bash
cd lambda/news-briefing

# Set environment variables
export MASSIVE_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export S3_BUCKET="your-bucket-name"
export AWS_REGION="us-east-1"

# Deploy
./deploy.sh
```

### 2. Set Up EventBridge Schedule

```bash
./setup-schedule.sh
```

This will trigger the Lambda every 3 hours by default.

### 3. Test Lambda

```bash
aws lambda invoke \
  --function-name predixa-news-briefing \
  --payload '{}' \
  response.json

cat response.json
```

Verify briefings appear in S3:
```bash
aws s3 ls s3://your-bucket/briefings/spy/
```

### 4. Test Website

1. Visit: `https://your-site.com/api/news/briefing?mode=pro`
2. Check response headers for `X-Source: s3` (should read from S3)
3. If S3 is empty, it will fallback to generation

### 5. iOS App Implementation (Phase 3)

**Pending tasks:**
- [ ] Create Swift models matching TypeScript types
- [ ] Add S3 briefing access to iOS app
- [ ] Add news/briefing UI section to iOS app

## Architecture

```
┌─────────────────┐
│  EventBridge    │  (Every 3 hours)
│     Schedule    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Lambda Function│  Fetch News → Generate Briefing
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   S3 Bucket     │  briefings/spy/latest-{mode}.json
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐  ┌──────────┐
│ Website│  │ iOS App  │  (Read from S3)
│  API   │  │          │
└────────┘  └──────────┘
```

## S3 Structure

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

## Environment Variables

### Lambda Function:
- `MASSIVE_API_KEY` - Required
- `OPENAI_API_KEY` - Required
- `S3_BUCKET` - Required (or `NEXT_PUBLIC_S3_BUCKET`)
- `AWS_REGION` - Optional (default: us-east-1)

### Website:
- Uses existing `NEXT_PUBLIC_S3_BUCKET`
- No new environment variables needed

## Testing Checklist

- [ ] Lambda function deploys successfully
- [ ] Lambda function generates briefings
- [ ] Briefings appear in S3
- [ ] EventBridge schedule triggers Lambda
- [ ] Website API reads from S3
- [ ] Website API falls back to generation if S3 empty
- [ ] All 3 modes (pro, simple, wsb) work
- [ ] Response headers show correct source

## Troubleshooting

### Lambda Issues
- Check CloudWatch logs: `aws logs tail /aws/lambda/predixa-news-briefing --follow`
- Verify IAM role has S3 permissions
- Check API keys are correct

### Website Issues
- Check browser console for errors
- Verify S3 bucket is accessible
- Check API route logs in Vercel/Next.js

### S3 Access
- Ensure bucket policy allows public read (or use signed URLs)
- Verify bucket name matches `NEXT_PUBLIC_S3_BUCKET`

## Notes

- The website will automatically use S3 briefings once they're available
- Fallback to generation ensures the feature always works
- In-memory cache provides additional performance layer
- Lambda runs on schedule, reducing API costs
- Both web and iOS can consume the same S3 data

