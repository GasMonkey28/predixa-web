# Environment Variables to Add

## New Environment Variables for Entitlements API Integration

Add these to your `.env.local` (for local development) and Vercel environment variables (for production):

### Required

```bash
# Entitlements API Gateway URL
# This is the API Gateway endpoint URL for your entitlements Lambda function
# Format: https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
ENTITLEMENTS_API_GATEWAY_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
```

### How to Get the API Gateway URL

1. **After deploying the entitlements Lambda:**
   - Go to AWS Console → API Gateway
   - Find your REST API (e.g., `predixa-entitlements-api`)
   - Go to Stages → `prod` (or your stage name)
   - Copy the "Invoke URL"
   - Append `/me/entitlements` to get the full URL

2. **Example URL format:**
   ```
   https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/me/entitlements
   ```

### Optional (for backward compatibility)

If you want to keep the old Stripe direct API calls as a fallback:

```bash
# Stripe API (already configured)
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Lambda Environment Variables

The Lambda functions need these (set in Lambda configuration, not in Next.js):

```bash
AWS_REGION=us-east-1
USERS_TABLE=UserProfiles
ENTITLEMENTS_TABLE=predixa_entitlements
STRIPE_API_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Testing

After adding the environment variable:

1. Restart your Next.js dev server: `npm run dev`
2. Sign in to your app
3. Navigate to a protected route (e.g., `/daily`)
4. Check browser console for any errors
5. Check Network tab to see if `/api/entitlements` is being called

## Troubleshooting

- **"Entitlements API not configured"**: Make sure `ENTITLEMENTS_API_GATEWAY_URL` is set
- **401 Unauthorized**: Check that your Cognito JWT is being sent correctly
- **CORS errors**: Make sure API Gateway has CORS enabled for your domain
- **502 Bad Gateway**: Check Lambda function logs in CloudWatch
