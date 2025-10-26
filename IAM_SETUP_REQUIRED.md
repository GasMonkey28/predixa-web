# ⚠️ IAM Setup Required for DynamoDB

Your DynamoDB table is created, but you need to configure IAM permissions for your users to access it.

## The Issue

When users sign in with Cognito, they get an **access token** but **not IAM credentials** needed to access DynamoDB.

## Solution Options

### Option 1: Use Identity Pool (Recommended)

An Identity Pool grants your users IAM credentials for DynamoDB.

#### Steps:

1. **Create Identity Pool**
   - Go to [Cognito Identity Pools](https://console.aws.amazon.com/cognito/v2/idp/pools)
   - Click "Create Identity Pool"
   - Name: `predixa-identity-pool`
   - Select your User Pool (`g5anv7`)
   - Click "Create"

2. **Set IAM Role Permissions**
   - After creating, click "Edit" on the authenticated role
   - Attach this policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:PutItem",
           "dynamodb:GetItem",
           "dynamodb:UpdateItem"
         ],
         "Resource": "arn:aws:dynamodb:us-east-1:822233328169:table/UserProfiles"
       }
     ]
   }
   ```

3. **Add Identity Pool ID to Amplify Config**

   Add to your `.env` or environment variables:
   ```bash
   NEXT_PUBLIC_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

4. **Update `src/lib/amplify.ts`**
   
   Uncomment the Identity Pool configuration:
   ```typescript
   {
     Auth: {
       Cognito: { /* ... */ },
       // Uncomment this:
       ...(process.env.NEXT_PUBLIC_IDENTITY_POOL_ID && {
         CognitoIdentity: {
           PoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID,
           Region: process.env.NEXT_PUBLIC_AWS_REGION,
         },
       }),
     }
   }
   ```

### Option 2: Simpler Approach - Use Cognito Attributes Instead

If you want to avoid IAM setup, you can keep using Cognito attributes but fix the permission issue.

1. Go to Cognito User Pool → App Clients
2. Select your app client
3. Enable write permissions for `given_name` and `family_name`
4. Done!

**This is actually the simplest solution** and you don't need DynamoDB at all.

---

## Which Should You Choose?

- **Option 2 (Cognito Attributes)** - ✅ Fastest, simplest
- **Option 1 (DynamoDB)** - ✅ More flexible, scalable, professional

Both work! Pick one.

---

## Quick Test

After configuring:

```bash
npm run dev
```

1. Sign in
2. Edit your name
3. Should work! ✨



