# Troubleshooting: "Failed to update profile via API"

## The Issue

When editing profile as **Google/Apple user**, you get:
```
Failed to update profile via API
```

## Why It Fails

The API route (`/api/user/profile`) needs AWS credentials to write to DynamoDB.

---

## Fix: Add AWS Credentials to `.env.local`

Add these to your `.env.local` file:

```bash
# AWS Credentials for Server-Side API Routes
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_DEFAULT_REGION=us-east-1
```

### How to Get AWS Credentials:

**Option 1: Use Existing AWS CLI Credentials**

If you already have `aws configure` set up, the API route will use those automatically (just needs region).

**Option 2: Create IAM User (Recommended for Production)**

1. Go to AWS Console → IAM
2. Create a new user (e.g., `dynamodb-writer`)
3. Attach policy: `AmazonDynamoDBFullAccess` (or custom policy)
4. Create access key
5. Add to `.env.local`

**Option 3: Use Your Current AWS Credentials**

If you can run `aws dynamodb list-tables`, you already have credentials. Just add them to `.env.local`.

---

## Quick Test

After adding credentials, check the terminal when you save profile:

You should see:
```
API: Updating profile for userId: ...
API: Updating existing profile
API: Profile updated successfully
```

If you see an error about credentials, check `.env.local`.

---

## Check Terminal for Exact Error

When you save, look at terminal output for:
- `Error updating profile:`
- `Error details:`

This will tell us exactly what went wrong.

---

## Alternative: Use IAM Role (Production)

For production (Vercel/AWS):
- Don't use environment variables for credentials
- Use IAM role instead
- The API route will automatically use the Lambda/ECS role

---

## Need Help?

Share the terminal error output when you try to save.

