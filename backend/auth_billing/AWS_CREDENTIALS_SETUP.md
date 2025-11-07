# AWS Credentials Setup Guide

## What You Need

To deploy Lambda functions, you need AWS credentials configured on your local machine. Here's how to get them and set them up.

## Option 1: AWS Access Keys (Recommended for CLI)

### Step 1: Create IAM User in AWS Console

1. **Go to AWS Console** → [IAM Dashboard](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Create user**
3. Enter username: `predixa-lambda-deployer`
4. Click **Next**

### Step 2: Attach Permissions

Select **Attach policies directly** and add these policies:

**Required:**
- `AWSLambda_FullAccess` - To create/update Lambda functions
- `IAMFullAccess` - To create IAM roles (one-time setup)
- `AmazonAPIGatewayAdministrator` - To create API Gateway endpoints
- `AmazonDynamoDBFullAccess` - To read/write DynamoDB tables
- `AmazonCognitoPowerUser` - To configure Cognito triggers

**Or create a custom policy** (more secure):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy",
        "iam:GetRole",
        "apigateway:*",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:CreateTable",
        "cognito-idp:UpdateUserPool",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

5. Click **Next** → **Create user**

### Step 3: Create Access Keys

1. Click on the user you just created
2. Go to **Security credentials** tab
3. Scroll to **Access keys** section
4. Click **Create access key**
5. Select **Command Line Interface (CLI)**
6. Click **Next** → **Create access key**
7. **IMPORTANT**: Copy both:
   - **Access key ID** (starts with `AKIA...`)
   - **Secret access key** (you'll only see this once!)

### Step 4: Configure AWS CLI

**Install AWS CLI** (if not installed):
```bash
# Windows (PowerShell)
winget install Amazon.AWSCLI

# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Configure credentials:**
```bash
aws configure
```

When prompted, enter:
```
AWS Access Key ID: [paste your Access Key ID]
AWS Secret Access Key: [paste your Secret Access Key]
Default region name: us-east-1
Default output format: json
```

**Verify it works:**
```bash
aws sts get-caller-identity
```

You should see your account ID and user ARN.

## Option 2: AWS Console (No CLI Needed)

If you prefer not to use CLI, you can deploy everything through the AWS Console UI:

### Deploy Lambda Functions via Console

1. **Go to Lambda Console** → [Create Function](https://console.aws.amazon.com/lambda/home#/create)
2. **Author from scratch**
3. Fill in:
   - Function name: `predixa-post-confirmation`
   - Runtime: `Python 3.11`
   - Architecture: `x86_64`
4. Click **Create function**
5. **Upload code:**
   - Scroll to **Code source**
   - Click **Upload from** → `.zip file`
   - Upload your `post_confirmation.zip`
6. **Configure environment variables:**
   - Go to **Configuration** → **Environment variables**
   - Add:
     - `AWS_REGION` = `us-east-1`
     - `USERS_TABLE` = `UserProfiles`
     - `ENTITLEMENTS_TABLE` = `predixa_entitlements`
     - `STRIPE_API_KEY` = `sk_live_xxx`
7. **Set handler:**
   - Configuration → General configuration → Edit
   - Handler: `post_confirmation_lambda.lambda_handler`
8. **Set timeout:**
   - Configuration → General configuration → Edit
   - Timeout: `30 seconds`
9. **Create IAM role:**
   - Configuration → Permissions → Edit
   - Create new role with basic Lambda permissions
   - Add DynamoDB permissions (see IAM setup below)

**Repeat for all 3 Lambda functions.**

### Create API Gateway via Console

1. **Go to API Gateway Console** → [Create API](https://console.aws.amazon.com/apigateway/main/apis)
2. **REST API** → **Build**
3. **New API** → **REST** → **Create**
4. Create resources and methods through the UI
5. Deploy to `prod` stage

## Option 3: Use Existing AWS Account

If you already have an AWS account:

1. **Check if AWS CLI is configured:**
   ```bash
   aws sts get-caller-identity
   ```

2. **If it works**, you're ready to deploy!

3. **If not**, follow Option 1 to create access keys

## Option 4: AWS CloudShell (No Local Setup)

AWS CloudShell is a browser-based terminal with AWS CLI pre-configured:

1. **Go to AWS Console** → Click the **CloudShell icon** (top right)
2. **Upload your code:**
   - Use the upload button in CloudShell
   - Upload your `.zip` files
3. **Run deployment commands** directly in CloudShell
4. **No local AWS CLI setup needed!**

## What Credentials Are Used For

- **Lambda deployment**: Creating/updating Lambda functions
- **IAM role creation**: One-time setup for Lambda execution roles
- **API Gateway**: Creating REST APIs and endpoints
- **DynamoDB**: Reading/writing to tables (via Lambda execution role)
- **Cognito**: Configuring Post-Confirmation trigger

## Security Best Practices

1. **Use IAM user** (not root account) for deployment
2. **Limit permissions** to only what's needed
3. **Rotate access keys** regularly
4. **Don't commit credentials** to git
5. **Use AWS Secrets Manager** for sensitive values (Stripe keys)

## Troubleshooting

### "Unable to locate credentials"
- Run `aws configure` to set up credentials
- Check `~/.aws/credentials` file exists (Linux/Mac) or `%USERPROFILE%\.aws\credentials` (Windows)

### "Access Denied"
- Check IAM user has required permissions
- Verify you're using the correct AWS account

### "Region not specified"
- Set default region: `aws configure set region us-east-1`
- Or use `--region us-east-1` in commands

## Next Steps

Once credentials are set up:

1. ✅ Verify: `aws sts get-caller-identity`
2. ✅ Follow `QUICK_DEPLOY.md` to deploy Lambda functions
3. ✅ Add `ENTITLEMENTS_API_GATEWAY_URL` to Vercel (see `VERCEL_ENV_SETUP.md`)

## Alternative: Ask Me to Generate Deployment Scripts

If you prefer, I can generate:
- **Terraform scripts** (Infrastructure as Code)
- **AWS SAM templates** (Serverless Application Model)
- **Step-by-step Console instructions** (no CLI needed)

Just let me know which approach you prefer!

