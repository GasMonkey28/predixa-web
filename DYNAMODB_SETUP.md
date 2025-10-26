# DynamoDB User Profile Setup

This guide shows you how to set up a DynamoDB table to store user profiles alongside Cognito authentication.

## Why DynamoDB Instead of Cognito Only?

1. **No Permission Issues**: Users can update their own profile data without Cognito app client permissions
2. **Flexible Schema**: Easily add new fields without modifying Cognito configuration
3. **Better for Complex Data**: Store preferences, settings, and metadata that don't fit in Cognito
4. **Independent Updates**: Update profiles without needing to modify Cognito tokens
5. **Scalable**: DynamoDB handles millions of reads/writes per second

## Setup Steps

### 1. Create DynamoDB Table

#### Option A: AWS Console

1. Go to [AWS DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Click **"Create table"**
3. Configure:
   - **Table name**: `UserProfiles`
   - **Partition key**: `userId` (String)
   - **Table settings**: Use default or "On-demand"
4. Click **"Create table"**

#### Option B: AWS CLI

```bash
aws dynamodb create-table \
  --table-name UserProfiles \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

#### Option C: Terraform (Recommended)

Create `infra/dynamodb.tf`:

```hcl
resource "aws_dynamodb_table" "user_profiles" {
  name           = "UserProfiles"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  # Optional: Add global secondary index for email lookups
  global_secondary_index {
    name     = "EmailIndex"
    hash_key = "email"
    
    attribute {
      name = "email"
      type = "S"
    }
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Enable encryption at rest
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "UserProfiles"
    Environment = "production"
  }
}

# Output the table name
output "user_profiles_table_name" {
  value = aws_dynamodb_table.user_profiles.name
}
```

### 2. Set IAM Permissions

Your app needs permissions to read/write to DynamoDB. Add this to your IAM role:

#### Via AWS Console:

1. Go to IAM → Roles
2. Find your Lambda/App role
3. Add inline policy or attach `AmazonDynamoDBFullAccess` (or create custom policy below)

#### Custom IAM Policy (Least Privilege):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/UserProfiles"
    }
  ]
}
```

### 3. Environment Variables

Add to your `.env.local` or deployment environment:

```bash
# DynamoDB
USER_PROFILE_TABLE_NAME=UserProfiles
AWS_REGION=us-east-1

# For local development (if using IAM credentials)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 4. Install AWS SDK

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### 5. Update Code

The `user-profile-service.ts` file has already been created. Now update your components to use it.

## Schema Design

```
UserProfiles
├── userId (Partition Key) - Cognito User ID
├── email - User email
├── givenName - First name
├── familyName - Last name
├── displayName - Full name
├── avatarUrl - Profile picture URL
├── stripeCustomerId - Stripe customer ID
├── revenueCatId - RevenueCat app user ID
├── preferences - User preferences (JSON object)
├── createdAt - Profile creation timestamp
└── updatedAt - Last update timestamp
```

## Benefits of This Approach

✅ **No Permission Issues**: Users update their own profile without Cognito restrictions  
✅ **Multiple Auth Providers**: Works seamlessly with email, Google, and Apple sign-in  
✅ **Fast Reads**: DynamoDB provides millisecond latency  
✅ **Auto-scaling**: Handles traffic spikes automatically  
✅ **Cost Effective**: Pay only for what you use (on-demand billing)  
✅ **Reliable**: Built-in backup and replication  

## Migration Strategy

If you have existing users in Cognito:

1. Create a migration script to backfill DynamoDB
2. Run it once for existing users
3. New users automatically create profiles on first sign-in

## Cost Estimate

- **DynamoDB**: ~$0.25 per million read requests, $1.25 per million write requests
- For 10,000 active users reading profiles once/day: **$0.75/month**
- For 100 profile updates/day: **$0.04/month**

## Next Steps

1. Update your `auth-store.ts` to use the new profile service
2. Update your account page to read/write from DynamoDB
3. Test locally and deploy



