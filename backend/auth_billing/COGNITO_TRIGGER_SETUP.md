# How to Add Cognito Post-Confirmation Trigger

## Step-by-Step Instructions

### 1. Navigate to Triggers
- In your Lambda function page, go to **Configuration** tab
- Click **Triggers** in the left sidebar
- Click **Add trigger** button

### 2. Select Trigger Source
On the "Add trigger" page:

1. **Find the "Select a source" dropdown** (it's a searchable dropdown)
2. **Type or search for**: `Cognito User Pool`
3. **Select**: "Cognito User Pool" from the list

### 3. Configure the Trigger
After selecting Cognito User Pool, you'll see:

- **User Pool**: Dropdown - Select your Cognito User Pool (e.g., `us-east-1_XXXXXXXXX`)
- **Trigger type**: Should show "Post confirmation" (or select it if there's a dropdown)
- **Recursive invocation**: Leave unchecked (optional)

### 4. Save
- Click **Add** button at the bottom

## If You Don't See "Cognito User Pool" Option

**Possible reasons:**
1. **Wrong region**: Make sure your Lambda function is in the same region as your Cognito User Pool (e.g., `us-east-1`)
2. **Permissions**: Your AWS account needs permissions to configure Cognito triggers
3. **User Pool doesn't exist**: Verify your Cognito User Pool exists in the same region

**To check region:**
- Lambda function: Look at the top right of Lambda console (shows region)
- Cognito User Pool: Go to Cognito Console → Your User Pool → Check the region in the ARN

## Alternative: Configure from Cognito Console

If you can't add the trigger from Lambda, you can configure it from Cognito:

1. Go to [Cognito Console](https://console.aws.amazon.com/cognito/)
2. Select your **User Pool**
3. Go to **User pool properties** → Scroll to **Lambda triggers**
4. Find **Post confirmation** trigger
5. Select your Lambda function: `predixa-post-confirmation`
6. Click **Save changes**

This method works the same way!

## Verify It's Working

After adding the trigger:
1. Go back to Lambda → **Configuration** → **Triggers**
2. You should see:
   - **Source**: Cognito User Pool
   - **User Pool**: Your pool name
   - **Trigger type**: Post confirmation

## Test the Trigger

1. Sign up a new user in your app
2. Check **CloudWatch Logs** for your Lambda function
3. You should see logs from the Post-Confirmation trigger executing

---

**Need help?** If you still can't find the option, let me know what you see in the dropdown!

