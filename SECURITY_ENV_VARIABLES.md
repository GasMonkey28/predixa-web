# Security: Required Environment Variables

## 🔒 Security Update

All sensitive values have been moved from hardcoded configuration to environment variables for security.

## Required Environment Variables

### Production (Vercel/Docker)

Add these to your deployment environment:

```bash
# S3 Configuration
NEXT_PUBLIC_S3_BUCKET=your-s3-bucket-name

# FRED API (Economic Calendar)
FRED_API_KEY=your-fred-api-key

# Optional defaults
NEXT_PUBLIC_TICKER=SPY
```

### Local Development (.env.local)

Create a `.env.local` file in the project root:

```bash
# S3 Configuration
NEXT_PUBLIC_S3_BUCKET=your-s3-bucket-name

# FRED API (Economic Calendar)
FRED_API_KEY=your-fred-api-key

# Optional defaults
NEXT_PUBLIC_TICKER=SPY
```

## What Was Changed

1. **S3 Bucket Name**: Removed from `next.config.js` → Now uses `NEXT_PUBLIC_S3_BUCKET` env var
2. **FRED API Key**: Removed hardcoded key → Now uses `FRED_API_KEY` env var

## Security Notes

- ✅ Never commit `.env.local` to version control
- ✅ `.env.local` is already in `.gitignore`
- ✅ All sensitive values are now in environment variables
- ✅ No AWS credentials or secrets are hardcoded
- ✅ Stripe keys are already using environment variables

## Getting Your Values

### FRED API Key

1. Go to [FRED API Registration](https://research.stlouisfed.org/useraccount/apikey)
2. Create an account (free)
3. Generate an API key
4. Add to your environment variables

### S3 Bucket Name

Your S3 bucket name should already be configured in your AWS account. If you need to find it:
1. Go to AWS Console → S3
2. Find your bucket name
3. Add to `NEXT_PUBLIC_S3_BUCKET` environment variable

## Important: Update Your Deployment

**If you're using Vercel or another hosting platform:**

1. Go to your project settings
2. Add `NEXT_PUBLIC_S3_BUCKET` environment variable
3. Add `FRED_API_KEY` environment variable
4. Redeploy your application

**Without these variables, the application will:**
- ❌ Not be able to load images from S3
- ❌ Not be able to fetch economic calendar data from FRED


















