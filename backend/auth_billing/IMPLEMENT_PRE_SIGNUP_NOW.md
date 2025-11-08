# Implement Pre-Signup Lambda - Step by Step

Follow these steps to implement duplicate email prevention.

---

## Step 1: Create EmailIndex GSI (5 minutes)

The Lambda needs to query users by email. We need a Global Secondary Index.

### Option A: AWS Console (Easiest)

1. Go to [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Click on **UserProfiles** table
3. Click **"Indexes"** tab
4. Click **"Create index"**
5. Configure:
   - **Partition key**: `email` (String)
   - **Index name**: `EmailIndex`
   - **Projection**: All attributes
6. Click **"Create index"**
7. Wait 1-2 minutes for index to be created

### Option B: AWS CLI

```bash
aws dynamodb update-table \
  --table-name UserProfiles \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --global-secondary-index-updates \
    "[{
      \"Create\": {
        \"IndexName\": \"EmailIndex\",
        \"KeySchema\": [{\"AttributeName\": \"email\", \"KeyType\": \"HASH\"}],
        \"Projection\": {\"ProjectionType\": \"ALL\"}
      }
    }]" \
  --region us-east-1
```

**Note**: If your table uses "On-demand" billing, the command above will work. If it uses "Provisioned", add this before the closing bracket:
```json
"ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
```

---

## Step 2: Package Lambda Code (2 minutes)

```bash
cd backend/auth_billing

# Windows PowerShell:
Compress-Archive -Path pre_signup_lambda.py,config.py,ddb.py -DestinationPath pre_signup.zip

# Mac/Linux:
zip pre_signup.zip pre_signup_lambda.py config.py ddb.py
```

You should now have `pre_signup.zip` file.

---

## Step 3: Create Lambda Function (5 minutes)

### 3.1 Create Function

1. Go to [Lambda Console](https://console.aws.amazon.com/lambda/)
2. Click **"Create function"**
3. Select **"Author from scratch"**
4. Fill in:
   - **Function name**: `predixa-pre-signup`
   - **Runtime**: `Python 3.12` (or `Python 3.11` if 3.12 not available)
   - **Architecture**: `x86_64`
5. **Change default execution role**:
   - Select **"Use an existing role"**
   - Choose `predixa-lambda-execution-role` (or your existing Lambda role)
6. Click **"Create function"**

### 3.2 Upload Code

1. Scroll to **"Code source"** section
2. Click **"Upload from"** → **".zip file"**
3. Select `pre_signup.zip` (the file you created in Step 2)
4. Click **"Save"**

### 3.3 Configure Handler

1. In **"Runtime settings"** section, click **"Edit"**
2. Set **Handler**: `pre_signup_lambda.lambda_handler`
3. Click **"Save"**

### 3.4 Set Timeout

1. Go to **"Configuration"** tab
2. Click **"General configuration"** → **"Edit"**
3. Set **Timeout**: `10 seconds`
4. Click **"Save"**

---

## Step 4: Add DynamoDB Permissions (3 minutes)

The Lambda needs permission to query the EmailIndex.

### Option A: Add to Existing Role (Recommended)

1. Go to [IAM Console](https://console.aws.amazon.com/iam/) → **Roles**
2. Find your Lambda execution role (e.g., `predixa-lambda-execution-role`)
3. Click on it
4. Go to **"Permissions"** tab
5. Click **"Add permissions"** → **"Create inline policy"**
6. Click **"JSON"** tab
7. Paste this policy (replace `ACCOUNT_ID` with your AWS account ID):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/UserProfiles/index/EmailIndex"
      ]
    }
  ]
}
```

8. Click **"Next"**
9. **Policy name**: `DynamoDBEmailIndexQuery`
10. Click **"Create policy"**

### Option B: Use AWS CLI

```bash
# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create policy document
cat > email-index-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:${ACCOUNT_ID}:table/UserProfiles/index/EmailIndex"
    }
  ]
}
EOF

# Attach to role (replace ROLE_NAME with your Lambda role name)
aws iam put-role-policy \
  --role-name predixa-lambda-execution-role \
  --policy-name DynamoDBEmailIndexQuery \
  --policy-document file://email-index-policy.json
```

---

## Step 5: Attach Lambda to Cognito (3 minutes)

### Option A: AWS Console

1. Go to [Cognito Console](https://console.aws.amazon.com/cognito/)
2. Click **"User pools"**
3. Click on your User Pool
4. Go to **"User pool properties"** → **"Lambda triggers"**
5. Find **"Pre sign-up"** trigger
6. Select **"predixa-pre-signup"** from dropdown
7. Click **"Save changes"**

### Option B: AWS CLI

```bash
# Get your User Pool ID (or use the one you know)
USER_POOL_ID="us-east-1_YOUR_POOL_ID"

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function \
  --function-name predixa-pre-signup \
  --query 'Configuration.FunctionArn' \
  --output text)

# Attach Pre-Signup trigger
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --lambda-config PreSignUp=$LAMBDA_ARN \
  --region us-east-1
```

---

## Step 6: Test It! (2 minutes)

### Test 1: Try to sign up with existing email

1. Go to your app's signup page
2. Try to sign up with an email that already exists
3. **Expected**: Error message: "An account with email X already exists. Please sign in instead or use a different email address."
4. ✅ **Success!**

### Test 2: Try to sign up with new email

1. Try to sign up with a completely new email
2. **Expected**: Signup proceeds normally
3. ✅ **Success!**

### Test 3: Check Lambda logs

1. Go to [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/)
2. Find log group: `/aws/lambda/predixa-pre-signup`
3. Check recent logs - you should see:
   - `📥 Pre-Signup event received`
   - `🔍 Pre-Signup: email=...`
   - Either `✅ Email is unique, allowing signup` or `⚠️ Email already exists`

---

## Troubleshooting

### Error: "EmailIndex not found"

**Solution**: Make sure Step 1 is complete. Wait a few minutes for the index to finish creating.

### Error: "AccessDeniedException" in Lambda logs

**Solution**: Make sure Step 4 is complete. The Lambda role needs DynamoDB Query permission.

### Lambda not triggering

**Solution**: 
1. Check Step 5 - Lambda must be attached to Cognito User Pool
2. Check Lambda logs in CloudWatch
3. Verify handler name is `pre_signup_lambda.lambda_handler`

### Still allowing duplicates

**Solution**:
1. Check Lambda logs for errors
2. Verify EmailIndex exists: `aws dynamodb describe-table --table-name UserProfiles --query 'Table.GlobalSecondaryIndexes'`
3. Check email is being normalized (lowercase) in the Lambda

---

## Quick Checklist

- [ ] Step 1: EmailIndex GSI created
- [ ] Step 2: Lambda code packaged (pre_signup.zip)
- [ ] Step 3: Lambda function created and code uploaded
- [ ] Step 4: DynamoDB permissions added to Lambda role
- [ ] Step 5: Lambda attached to Cognito User Pool
- [ ] Step 6: Tested with duplicate email (blocked ✅)
- [ ] Step 6: Tested with new email (allowed ✅)

---

## You're Done! 🎉

Once all steps are complete, your app will:
- ✅ Prevent duplicate email signups
- ✅ Work for both email/password and Google sign-in
- ✅ Show clear error messages to users

**No more duplicate accounts!** 🚀

