# S3 Bucket Policy Update - Model2 Public Access

## Issue
The Model2 API is getting a 403 Forbidden error when trying to access:
- `s3://tradespark-822233328169-us-east-1/model2_y2y3/chart/latest.json`

## Required Update

Add the following statement to the S3 bucket policy for `tradespark-822233328169-us-east-1`:

**Specific folder path for Model2 chart data:**

```json
{
  "Sid": "AllowPublicReadModel2Chart",
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::tradespark-822233328169-us-east-1/model2_y2y3/chart/*"
}
```

**Or if you want to allow access to the entire model2_y2y3 folder:**

```json
{
  "Sid": "AllowPublicReadModel2",
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::tradespark-822233328169-us-east-1/model2_y2y3/*"
}
```

**Recommended:** Use the first option (specific to `chart/*`) for better security - only allows access to the chart folder.

## How to Update

1. Go to AWS S3 Console
2. Select bucket: `tradespark-822233328169-us-east-1`
3. Go to **Permissions** tab
4. Scroll to **Bucket policy**
5. Click **Edit**
6. Add the statement above to the existing policy
7. Save changes

## Verification

After updating, test the API:
```bash
curl https://s3.amazonaws.com/tradespark-822233328169-us-east-1/model2_y2y3/chart/latest.json
```

Or test via the website:
- Visit: `http://localhost:3000/api/model2/daily`
- Should return Model2 data instead of fallback

## Current Policy Structure

The bucket policy currently allows public read for:
- ✅ `bars/*`
- ✅ `tiers/*`
- ✅ `charts/*`
- ✅ `summary_json/*`
- ✅ `briefings/*`
- ✅ `weekly/*`
- ❌ `model2_y2y3/chart/*` (needs to be added)

## Exact Path Required

The API needs access to:
- **Bucket:** `tradespark-822233328169-us-east-1`
- **Path:** `model2_y2y3/chart/latest.json`
- **Full S3 path:** `s3://tradespark-822233328169-us-east-1/model2_y2y3/chart/latest.json`
- **HTTP URL:** `https://s3.amazonaws.com/tradespark-822233328169-us-east-1/model2_y2y3/chart/latest.json`

## Security

- Only `model2_y2y3/chart/*` folder will be publicly readable (if using the specific path)
- Or only `model2_y2y3/*` folder will be publicly readable (if using the broader path)
- Only `GetObject` action is allowed (read-only)
- No write or delete permissions granted
- Other folders in the bucket remain protected
