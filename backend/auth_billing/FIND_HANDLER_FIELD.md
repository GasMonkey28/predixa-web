# Where to Find the Handler Field in Lambda

## The Handler Field is NOT in "Edit basic settings"

The handler field is in a different location. Here's where to find it:

## Method 1: Code Tab (Easiest)

1. **Go to your Lambda function**: `predixa-post-confirmation`
2. Click the **"Code"** tab (at the top, next to "Test", "Monitor", "Configuration")
3. Scroll down in the Code tab
4. Look for **"Runtime settings"** section (usually on the right side or below the code)
5. Click **"Edit"** next to Runtime settings
6. You'll see:
   - **Runtime**: Python 3.11
   - **Handler**: `lambda_function.lambda_handler` ← **Change this!**
7. Change **Handler** to: `post_confirmation_lambda.lambda_handler`
8. Click **Save**

## Method 2: Configuration → General Configuration (Alternative)

1. Go to **Configuration** tab → **General configuration**
2. Look for **"Runtime settings"** section (might be collapsed or below other settings)
3. Click **"Edit"** on Runtime settings
4. Find the **Handler** field
5. Change it to: `post_confirmation_lambda.lambda_handler`
6. Click **Save**

## Visual Guide

```
Lambda Function Page
│
├─ Code tab ← Handler is usually here under "Runtime settings"
│  └─ Runtime settings
│     └─ Handler: post_confirmation_lambda.lambda_handler
│
└─ Configuration tab
   └─ General configuration
      └─ Runtime settings (if visible)
         └─ Handler
```

## Quick Fix Steps

1. **Click "Code" tab** (top navigation)
2. **Look for "Runtime settings"** (usually on the right sidebar or below code editor)
3. **Click "Edit"** on Runtime settings
4. **Change Handler** from `lambda_function.lambda_handler` to `post_confirmation_lambda.lambda_handler`
5. **Click "Save"**

## If You Still Can't Find It

The handler might be in a collapsed section. Try:
- Look for a **"Runtime settings"** link or button
- Check if there's a **"Edit runtime settings"** option
- The handler field is always near the Runtime field (Python 3.11)

---

**The handler field is definitely there - it's just in the "Code" tab under "Runtime settings", not in "Edit basic settings"!**

