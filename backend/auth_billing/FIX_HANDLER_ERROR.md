# Fix Lambda Handler Error

## The Error

```
Runtime.ImportModuleError: Unable to import module 'lambda_function': No module named 'lambda_function'
```

## The Problem

The Lambda function handler is set incorrectly. It's trying to import `lambda_function` but your code file is named `post_confirmation_lambda.py`.

## The Fix

### Step 1: Go to Lambda Function Configuration

1. Go to [Lambda Console](https://console.aws.amazon.com/lambda/)
2. Click on `predixa-post-confirmation` function
3. Go to **Configuration** tab → **General configuration**
4. Click **Edit**

### Step 2: Fix the Handler

1. Find the **Handler** field
2. Change it from: `lambda_function.lambda_handler` (or whatever it currently is)
3. To: `post_confirmation_lambda.lambda_handler`
4. Click **Save**

### Step 3: Verify Handler for All Functions

Make sure each Lambda function has the correct handler:

| Function Name | Handler |
|--------------|---------|
| `predixa-post-confirmation` | `post_confirmation_lambda.lambda_handler` |
| `predixa-stripe-webhook` | `stripe_webhook_lambda.lambda_handler` |
| `predixa-entitlements-api` | `entitlements_api_lambda.lambda_handler` |

## Why This Happened

When you create a Lambda function, AWS defaults the handler to `lambda_function.lambda_handler`, but your code files are named differently:
- `post_confirmation_lambda.py` (not `lambda_function.py`)
- `stripe_webhook_lambda.py`
- `entitlements_api_lambda.py`

The handler format is: `filename_without_extension.function_name`

So:
- File: `post_confirmation_lambda.py` → Handler: `post_confirmation_lambda.lambda_handler`
- File: `stripe_webhook_lambda.py` → Handler: `stripe_webhook_lambda.lambda_handler`
- File: `entitlements_api_lambda.py` → Handler: `entitlements_api_lambda.lambda_handler`

## Test Again

After fixing the handler:
1. Go to Lambda → `predixa-post-confirmation`
2. Click **Test** tab
3. Create a test event (or use default)
4. Click **Test**
5. Should work now! ✅

## Verify It's Fixed

Check the logs - you should see:
- ✅ No more "No module named 'lambda_function'" error
- ✅ Your function code executing
- ✅ Logs from your Post-Confirmation handler

---

**Fix the handler and test again!** This should resolve the error.

