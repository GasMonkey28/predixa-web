# Deploy Lambda Functions via AWS Console (No CLI)

This guide walks you through deploying all Lambda functions using only the AWS Console web interface - no command line needed!

## Prerequisites

1. AWS account with appropriate permissions
2. DynamoDB tables created (UserProfiles, predixa_entitlements)
3. Stripe API keys ready

## Step 1: Package Lambda Code

### On Your Local Machine

```bash
cd backend/auth_billing

# Install dependencies
pip install -r requirements.txt -t package/

# Copy Python files
# Windows PowerShell:
Copy-Item *.py package\

# Create zip files
Compress-Archive -Path package\* -DestinationPath post_confirmation.zip
Compress-Archive -Path package\* -DestinationPath stripe_webhook.zip
Compress-Archive -Path package\* -DestinationPath entitlements_api.zip
```

You should now have 3 zip files ready to upload.

## Step 2: Create IAM Execution Role

1. **Go to IAM Console** → [Roles](https://console.aws.amazon.com/iam/home#/roles)
2. Click **Create role**
3. **Trusted entity type**: AWS service
4. **Use case**: Lambda
5. Click **Next**
6. **Attach policies**:
   - `AWSLambdaBasicExecutionRole` (for CloudWatch logs)
7. Click **Next**
8. **Role name**: `predixa-lambda-execution-role`
9. Click **Create role**

### Add DynamoDB Permissions

1. Click on the role you just created
2. Go to **Permissions** tab
3. Click **Add permissions** → **Create inline policy**
4. Click **JSON** tab
5. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/UserProfiles",
        "arn:aws:dynamodb:us-east-1:*:table/predixa_entitlements"
      ]
    }
  ]
}
```

6. Click **Next**
7. **Policy name**: `DynamoDBAccess`
8. Click **Create policy**

**Note the Role ARN** - you'll need it: `arn:aws:iam::YOUR_ACCOUNT_ID:role/predixa-lambda-execution-role`

## Step 3: Deploy Post-Confirmation Lambda

1. **Go to Lambda Console** → [Create Function](https://console.aws.amazon.com/lambda/home#/create)
2. **Author from scratch**
3. Fill in:
   - **Function name**: `predixa-post-confirmation`
   - **Runtime**: `Python 3.11`
   - **Architecture**: `x86_64`
4. **Change default execution role**:
   - Select **Use an existing role**
   - Choose `predixa-lambda-execution-role`
5. Click **Create function**

### Upload Code

1. Scroll to **Code source** section
2. Click **Upload from** → **.zip file**
3. Select `post_confirmation.zip`
4. Click **Save**

### Configure Handler (IMPORTANT!)

**The handler field is in the "Code" tab, not "Edit basic settings":**

1. Click the **"Code"** tab (at the top, next to "Test", "Monitor", "Configuration")
2. Scroll down and look for **"Runtime settings"** section (usually on the right side or below code)
3. Click **"Edit"** next to Runtime settings
4. You'll see:
   - **Runtime**: Python 3.11
   - **Handler**: `lambda_function.lambda_handler` ← **Change this!**
5. Change **Handler** to: `post_confirmation_lambda.lambda_handler` ⚠️ **Critical!**
   - The handler must match: `filename_without_extension.function_name`
   - File is `post_confirmation_lambda.py` → Handler is `post_confirmation_lambda.lambda_handler`
6. Click **Save**

**Alternative location:** If not in Code tab, try **Configuration** → **General configuration** → Look for **"Runtime settings"** section

**Common Error:** If handler is set to `lambda_function.lambda_handler`, you'll get "No module named 'lambda_function'" error. Make sure it's `post_confirmation_lambda.lambda_handler`!

### Configure Timeout and Memory

1. Go to **Configuration** tab → **General configuration**
2. Click **Edit**
3. **Timeout**: `30 seconds` (0 min 30 sec)
4. **Memory**: `256 MB`
5. Click **Save**

### Set Environment Variables

1. **Configuration** → **Environment variables**
2. Click **Edit**
3. Add variables:
   - `USERS_TABLE` = `UserProfiles`
   - `ENTITLEMENTS_TABLE` = `predixa_entitlements`
   - `STRIPE_API_KEY` = `sk_live_xxx` (your Stripe secret key)
   
   **Note:** `AWS_REGION` is automatically set by Lambda - don't add it manually!
4. Click **Save**

### Add Cognito Trigger

**Found it!** Configure from Cognito Console → **Authentication** → **Extensions**:

1. **Go to Cognito Console** → [User Pools](https://console.aws.amazon.com/cognito/)
2. **Select your User Pool** (you should see "User pool - g5anv7" at the top)
3. In the left sidebar, click **"Authentication"** → **"Extensions"**
4. Click **"Add Lambda trigger"** button
5. On the "Add Lambda trigger" page:
   - **Trigger type**: Select **"Sign-up"** (radio button)
   - Under "Sign-up" section, select **"Post confirmation trigger"** (radio button)
     - Description: "Customize welcome messages and log events for custom analytics."
   - **Lambda function**: In the dropdown, select **`predixa-post-confirmation`**
6. Click **"Add Lambda trigger"** button (orange button at bottom right)

**Verify:** 
- ✅ You should see a success message: "Lambda trigger 'Post confirmation' has been added successfully"
- ✅ Go back to Cognito → **Authentication** → **Extensions** → You should see "Post confirmation" listed with `predixa-post-confirmation`
- **Note:** The trigger may NOT show in Lambda's "Triggers" tab - this is normal! Triggers configured from Cognito side don't always appear in Lambda's UI, but they still work perfectly.

**Test it:** 
- Option 1: Sign up a new user in your app and check CloudWatch Logs
- Option 2: Use a proper test event (see `TEST_LAMBDA_EVENT.json` for format)
- The test event `{"key1": "value1"}` won't work - it needs Cognito event structure

## Step 4: Deploy Stripe Webhook Lambda

1. **Create new function**: `predixa-stripe-webhook`
2. **Runtime**: Python 3.11
3. **Role**: `predixa-lambda-execution-role`
4. **Upload**: `stripe_webhook.zip`
5. **Handler**: `stripe_webhook_lambda.lambda_handler`
6. **Timeout**: 30 seconds
7. **Memory**: 256 MB
8. **Environment variables**:
   - `USERS_TABLE` = `UserProfiles`
   - `ENTITLEMENTS_TABLE` = `predixa_entitlements`
   - `STRIPE_API_KEY` = `sk_live_xxx`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_xxx` (get from Stripe Dashboard after creating webhook)
   
   **Note:** `AWS_REGION` is automatically set by Lambda - don't add it manually!

## Step 5: Deploy Entitlements API Lambda

1. **Create new function**: `predixa-entitlements-api`
2. **Runtime**: Python 3.11
3. **Role**: `predixa-lambda-execution-role`
4. **Upload**: `entitlements_api.zip`
5. **Handler**: `entitlements_api_lambda.lambda_handler`
6. **Timeout**: 10 seconds
7. **Memory**: 128 MB
8. **Environment variables**:
   - `USERS_TABLE` = `UserProfiles`
   - `ENTITLEMENTS_TABLE` = `predixa_entitlements`
   
   **Note:** `AWS_REGION` is automatically set by Lambda - don't add it manually!

## Step 6: Create API Gateway for Webhook

1. **Go to API Gateway Console** → [Create API](https://console.aws.amazon.com/apigateway/main/apis)
2. **REST API** → **Build**
3. **New API** → **REST** → **Create**
4. **API name**: `predixa-stripe-webhook`
5. Click **Create**

### Create Resources

**Important:** The "Resource path" field is a **dropdown** to select the parent. Type the new segment name in **"Resource name"** field!

#### Create `/stripe` Resource

1. Click **Actions** → **Create Resource**
2. **Resource path** (dropdown): Select `/` (root - this is the parent)
3. **Resource name** (text field): Type `stripe` ← **Type here!**
4. Click **Create Resource**
   - This creates `/stripe` under the root `/`

#### Create `/stripe/webhook` Resource

1. **Select `/stripe` resource** (click on it in the left sidebar)
2. Click **Actions** → **Create Resource**
3. **Resource path** (dropdown): Select `/stripe` (this is the parent)
4. **Resource name** (text field): Type `webhook` ← **Type here!**
5. Click **Create Resource**
   - This creates `/stripe/webhook` under `/stripe`

### Create POST Method

1. Select `/stripe/webhook` resource
2. Click **Actions** → **Create Method**
3. Select **POST** → Click checkmark
4. **Integration type**: Lambda Function
5. **Lambda Function**: `predixa-stripe-webhook`
6. **Use Lambda Proxy integration**: ✅ (checked)
7. Click **Save** → **OK** (when prompted to give API Gateway permission)

### Deploy API

1. Click **Actions** → **Deploy API**
2. **Deployment stage**: `[New Stage]`
3. **Stage name**: `prod`
4. Click **Deploy**
5. **Note the Invoke URL**: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod`

**Webhook URL**: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/stripe/webhook`

## Step 7: Create API Gateway for Entitlements API

1. **Create new REST API**: `predixa-entitlements-api`
2. **Create resource**: `/me`
3. **Create resource under `/me`**: `/entitlements`

### Create Cognito User Pool Authorizer (Do This First!)

**Important:** You must create the Authorizer BEFORE you can select it in the method!

1. In API Gateway, click **"Authorizers"** in the left sidebar (under your API)
2. Click **"Create New Authorizer"** button
3. **Name**: `CognitoAuthorizer` (or any name you like)
4. **Type**: `Cognito`
5. **Cognito User Pool**: Select your User Pool (e.g., `us-east-1_g5anv7`)
6. **Token Source**: `Authorization` (this is the header name)
7. Click **"Create"**
8. **Note:** You should see the authorizer listed in the Authorizers section

### Create GET Method with Cognito Authorizer

1. **Go back to Resources** (click "Resources" in left sidebar)
2. Select `/me/entitlements` resource
3. Click **Actions** → **Create Method**
4. Select **GET** → Click checkmark
5. **Authorization** (dropdown): Now you should see `CognitoAuthorizer` - **Select it!**
   - If you don't see it, make sure you created the Authorizer first (step above)
6. **Integration type**: Lambda Function
7. **Lambda Function**: `predixa-entitlements-api`
8. **Use Lambda Proxy integration**: ✅ (checked)
9. Click **Save** → **OK** (when prompted to give API Gateway permission)

### Deploy API

1. Click **Actions** → **Deploy API**
2. **Deployment stage**: `[New Stage]`
3. **Stage name**: `prod`
4. Click **Deploy**
5. **Note the Invoke URL**: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod`

**Entitlements API URL**: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements`

**This is the URL you'll add to Vercel as `ENTITLEMENTS_API_GATEWAY_URL`!**

## Step 8: Configure Stripe Webhook

### Find Your Webhook URL (If You Forgot to Copy It)

If you forgot to copy the webhook URL from Step 6:

1. **Go to API Gateway Console** → Select `predixa-stripe-webhook` API
2. **Click "Stages"** in left sidebar → Click on `prod` stage
3. **Copy the "Invoke URL"** at the top (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)
4. **Add `/stripe/webhook`** to the end
5. **Full webhook URL**: `https://abc123.execute-api.us-east-1.amazonaws.com/prod/stripe/webhook`

**Alternative:** Go to Resources → `/stripe/webhook` → Click on POST method → Invoke URL is shown at the top

## Step 8: Configure Stripe Webhook

1. **Go to Stripe Dashboard** → [Webhooks](https://dashboard.stripe.com/webhooks) or **Destinations**
2. Click **Add endpoint** (or **Add destination**)
3. **Endpoint URL**: Paste your webhook URL from Step 6
   ```
   https://7hx1xklkac.execute-api.us-east-1.amazonaws.com/prod/stripe/webhook
   ```
4. **Destination name** (or Description): `Predixa Subscription Updates`
5. **Events to send**: Select these 5 events:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. Click **"Save destination"** (or **"Add endpoint"**)

### Get the Webhook Secret (After Saving)

**Important:** The webhook secret is shown **AFTER** you save, not during creation!

1. **After clicking "Save destination"**, you'll be taken to the webhook details page
2. **If not, click on your webhook name** (e.g., "Predixa Subscription Updates")
3. **Look for "Signing secret"** section (usually near the top, below the endpoint URL)
4. **Click "Reveal"** button to show the secret
5. **Copy the secret** - it starts with `whsec_...`
   - Example: `whsec_1234567890abcdef...`
6. **Add to Lambda environment variable**:
   - Go to Lambda Console → `predixa-stripe-webhook`
   - Configuration → Environment variables
   - Edit `STRIPE_WEBHOOK_SECRET` → Paste the secret → Save

**If you don't see "Signing secret":**
- Make sure you saved the webhook first
- Click on the webhook name to view details (not just the list)
- Look for "Reveal" button - the secret is hidden by default

## Step 9: Add Environment Variable to Vercel

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. **Add new variable**:
   - **Name**: `ENTITLEMENTS_API_GATEWAY_URL`
   - **Value**: `https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/me/entitlements`
   - **Environments**: Production, Preview, Development
3. Click **Save**
4. **Redeploy** your Vercel application

## Testing

1. **Sign up a new user** → Check CloudWatch Logs for Post-Confirmation Lambda
2. **Subscribe via Stripe** → Check webhook delivery in Stripe Dashboard
3. **Access protected route** → Should check entitlements API

## Troubleshooting

- **Lambda not executing**: Check CloudWatch Logs
- **API Gateway 403**: Check Lambda permissions
- **Cognito Authorizer failing**: Verify User Pool ID is correct
- **Webhook not receiving events**: Check Stripe webhook endpoint URL

---

**That's it!** You've deployed everything via the AWS Console. No CLI needed! 🎉

