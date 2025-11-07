# Configure Cognito Trigger from Cognito Console

Since "Cognito User Pool" doesn't appear in Lambda's trigger dropdown, configure it from Cognito instead.

## Step-by-Step Instructions

### 1. Go to Cognito Console

1. Open [AWS Cognito Console](https://console.aws.amazon.com/cognito/)
2. Click **User pools** (left sidebar)
3. **Select your User Pool** (click on the pool name, not the checkbox)

### 2. Navigate to Lambda Triggers

1. In your User Pool page, look at the left sidebar
2. Scroll down to find **"Lambda triggers"** or **"User pool properties"**
3. Click on **"Lambda triggers"**

### 3. Configure Post-Confirmation Trigger

1. You'll see a list of trigger types:
   - Pre sign-up
   - **Post confirmation** ← This one!
   - Pre authentication
   - Post authentication
   - etc.

2. Find **"Post confirmation"** in the list

3. Click the dropdown next to "Post confirmation" (or click "Edit" if there's a button)

4. **Select your Lambda function**: `predixa-post-confirmation`
   - If you don't see it, make sure:
     - Lambda function is in the same region as Cognito User Pool
     - Lambda function name is exactly: `predixa-post-confirmation`

5. Click **Save changes** (or **Save**)

### 4. Verify

After saving, you should see:
- **Post confirmation**: `predixa-post-confirmation` (or the ARN)

### 5. Check Lambda Function

Go back to your Lambda function:
1. **Configuration** → **Triggers**
2. You should now see the Cognito trigger listed (even though you configured it from Cognito)

## If You Don't See "Lambda triggers" Option

**Alternative path:**
1. In User Pool page → **User pool properties** tab
2. Scroll down to **"Lambda configuration"** section
3. Find **"Post confirmation"**
4. Select your Lambda function
5. Save

## Troubleshooting

### Lambda function not appearing in dropdown?

1. **Check region**: Lambda and Cognito must be in same region (e.g., both `us-east-1`)
2. **Check function name**: Must be exactly `predixa-post-confirmation`
3. **Check permissions**: Your AWS account needs permission to configure triggers

### Still having issues?

You can also use AWS CLI:
```bash
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX \
  --lambda-config PostConfirmation=arn:aws:lambda:us-east-1:ACCOUNT_ID:function:predixa-post-confirmation
```

Replace:
- `us-east-1_XXXXXXXXX` with your User Pool ID
- `ACCOUNT_ID` with your AWS account ID

---

**This method works perfectly!** Many users find it easier than configuring from Lambda side.

