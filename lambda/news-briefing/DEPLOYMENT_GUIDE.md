# Deployment Guide: News Briefing Lambda

## Quick Start

1. **Set environment variables:**
   ```bash
   export MASSIVE_API_KEY="your-massive-api-key"
   export OPENAI_API_KEY="your-openai-api-key"
   export S3_BUCKET="your-s3-bucket-name"  # or NEXT_PUBLIC_S3_BUCKET
   export AWS_REGION="us-east-1"
   ```

2. **Deploy Lambda function:**
   ```bash
   cd lambda/news-briefing
   ./deploy.sh
   ```

3. **Set up EventBridge schedule:**
   ```bash
   ./setup-schedule.sh
   ```

4. **Test the function:**
   ```bash
   aws lambda invoke \
     --function-name predixa-news-briefing \
     --payload '{}' \
     response.json
   cat response.json
   ```

## IAM Role Requirements

Your Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/briefings/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## S3 Bucket Configuration

Ensure your S3 bucket allows the Lambda role to write:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowLambdaWrite",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:role/lambda-execution-role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/briefings/*"
    }
  ]
}
```

## Schedule Options

Default: Every 3 hours (`rate(3 hours)`)

Other options:
- Every 2 hours: `rate(2 hours)`
- Every 4 hours: `rate(4 hours)`
- Daily at 9 AM ET: `cron(0 13 * * ? *)` (13:00 UTC = 9 AM ET)
- Twice daily: `cron(0 13,21 * * ? *)` (9 AM and 5 PM ET)

To change schedule:
```bash
export SCHEDULE="rate(2 hours)"
./setup-schedule.sh
```

## Monitoring

View logs:
```bash
aws logs tail /aws/lambda/predixa-news-briefing --follow
```

View recent invocations:
```bash
aws lambda list-functions --query 'Functions[?FunctionName==`predixa-news-briefing`]'
```

## Troubleshooting

### Function not found
- Run `./deploy.sh` to create the function
- Check AWS credentials are configured

### Permission denied
- Verify IAM role has S3 permissions
- Check bucket policy allows Lambda role

### Timeout errors
- Increase timeout: `aws lambda update-function-configuration --function-name predixa-news-briefing --timeout 600`
- Increase memory: `--memory-size 1024`

### No briefings in S3
- Check CloudWatch logs for errors
- Verify API keys are correct
- Test function manually with `aws lambda invoke`

## Next Steps

After Lambda is deployed and running:

1. ✅ Verify briefings appear in S3: `aws s3 ls s3://your-bucket/briefings/spy/`
2. ✅ Test website API route: `curl https://your-site.com/api/news/briefing?mode=pro`
3. ✅ Verify website reads from S3 (check response headers for `X-Source: s3`)
4. ✅ Update iOS app to read from S3 (see iOS implementation steps)

