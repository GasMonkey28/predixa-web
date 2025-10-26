# 🔧 Fix OAuth Users Editing Profiles

## Problem

Google and Apple sign-in users get error: "Access Token does not have required scopes" when trying to edit their profiles.

## Solution

I've updated the code to automatically use **DynamoDB** for OAuth users. Now you just need to set up **IAM permissions**.

---

## Quick Setup (5 minutes)

### Step 1: Create Identity Pool

This gives OAuth users IAM credentials to access DynamoDB.

```bash
# Run this command to create an Identity Pool
aws cognito-identity create-identity-pool \
  --identity-pool-name predixa-profiles \
  --allow-unauthenticated-identities \
  --cognito-identity-providers IdentityProviderId=$(aws cognito-idp describe-user-pool --user-pool-id us-east-1_iYC6qs6H2 --query "UserPool.Id" --output text),ServerSideTokenCheck=true
```

**Copy the IdentityPoolId** from the output.

### Step 2: Attach IAM Policy to Authenticated Role

The Identity Pool will have a role like `Cognito_*_Auth_Role`. Attach this policy:

```bash
# Get the role name
IDENTITY_POOL_ID="your-identity-pool-id-from-step-1"
ROLE_NAME=$(aws cognito-identity describe-identity-pool --identity-pool-id $IDENTITY_POOL_ID --query "AllowUnauthenticatedIdentities" --output text)

# Create the policy document
cat > dynamodb-policy.json << 'EOF'
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
EOF

# Attach to the authenticated role
aws iam put-role-policy \
  --role-name Cognito_${IDENTITY_POOL_ID}Auth_Role \
  --policy-name DynamoDBUserProfilesPolicy \
  --policy-document file://dynamodb-policy.json
```

### Step 3: Update Amplify Config

Add to `.env.local`:

```bash
NEXT_PUBLIC_IDENTITY_POOL_ID=your-identity-pool-id
```

### Step 4: Update amplify.ts

Uncomment the Identity Pool section in `src/lib/amplify.ts`:

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

### Step 5: Test

```bash
npm run dev
```

1. Sign in with Google/Apple
2. Try editing your name
3. Should work! ✨

---

## How It Works

```
OAuth User (Google/Apple)
    ↓
Sign in → Get Cognito session
    ↓
Try to update Cognito attributes → ❌ Fails (no scope)
    ↓
Fallback to DynamoDB → ✅ Works (with IAM credentials)
```

---

## Alternative: Use AWS Console

If CLI is too complex, use the AWS Console:

1. **Create Identity Pool**: https://console.aws.amazon.com/cognito/v2/identity/identity-pools
2. **Select your User Pool** as the Identity Provider
3. **Save the Identity Pool ID**
4. **Go to IAM** → Find the "Cognito_*Auth_Role"
5. **Attach policy** with DynamoDB access to `UserProfiles` table
6. **Add Identity Pool ID** to env variables
7. **Update amplify.ts** as shown above

---

## That's It!

Once IAM permissions are set up, OAuth users can edit profiles using DynamoDB! 🎉

