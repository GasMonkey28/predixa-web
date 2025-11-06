# 🔴 CRITICAL: Fix Email/Password Authentication

## The Problem

You're getting "Incorrect username or password" errors when trying to sign in with email/password, even though:
- ✅ Sign-up works
- ✅ Email confirmation works  
- ✅ Google sign-in works
- ❌ Email/password sign-in fails

## Root Cause

Your **Cognito App Client** is missing the `ALLOW_USER_PASSWORD_AUTH` authentication flow. This is required for username/password authentication.

## The Fix

### Option 1: Fix via AWS Console (Recommended - 2 minutes)

1. **Go to AWS Cognito Console**
   - Navigate to: https://console.aws.amazon.com/cognito/
   - Click **"User pools"**
   - Click on your user pool (e.g., `us-east-1_iYC6qs6H2`)

2. **Navigate to App Clients**
   - In the left sidebar → **"App integration"** → **"App clients"**
   - Click on your app client

3. **Enable Authentication Flows**
   - Scroll down to **"Authentication flows configuration"**
   - Under **"Explicit auth flows"**, check these boxes:
     - ☑ `ALLOW_USER_PASSWORD_AUTH` ⭐ **CRITICAL**
     - ☑ `ALLOW_USER_SRP_AUTH`
     - ☑ `ALLOW_REFRESH_TOKEN_AUTH`
     - ☑ `ALLOW_USER_AUTH`

4. **Save Changes**
   - Click **"Save changes"** at the bottom
   - Wait for confirmation

5. **Test**
   - Try signing in with email/password again
   - It should work now!

### Option 2: Fix via AWS CLI

If you have AWS CLI configured, run this PowerShell script:

```powershell
# Replace with your actual values
$USER_POOL_ID = "us-east-1_iYC6qs6H2"
$APP_CLIENT_ID = "3vf9s73uqkuv7i838beshgaama"

# Get current configuration
$json = aws cognito-idp describe-user-pool-client `
    --user-pool-id $USER_POOL_ID `
    --client-id $APP_CLIENT_ID `
    --output json

$config = $json | ConvertFrom-Json
$client = $config.UserPoolClient

# Update with ALLOW_USER_PASSWORD_AUTH
aws cognito-idp update-user-pool-client `
    --user-pool-id $USER_POOL_ID `
    --client-id $APP_CLIENT_ID `
    --client-name $client.ClientName `
    --generate-secret $false `
    --refresh-token-validity $client.RefreshTokenValidity `
    --access-token-validity $client.AccessTokenValidity `
    --id-token-validity $client.IdTokenValidity `
    --explicit-auth-flows ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH `
    --supported-identity-providers $client.SupportedIdentityProviders `
    --callback-urls $client.CallbackURLs `
    --logout-urls $client.LogoutURLs `
    --allowed-o-auth-flows code implicit `
    --allowed-o-auth-scopes email phone profile openid aws.cognito.signin.user.admin `
    --allowed-o-auth-flows-user-pool-client `
    --prevent-user-existence-errors $client.PreventUserExistenceErrors `
    --write-attributes email given_name family_name `
    --read-attributes email given_name family_name name
```

## Verify the Fix

After making the change, you can verify it worked by:

1. **Check the console logs** - You should no longer see "NotAuthorizedException"
2. **Try signing in** - Email/password authentication should work
3. **Use the diagnostic endpoint** - Visit `/api/debug-user?email=your-email@example.com` to check user status

## Why This Happened

After setting up Stripe, you may have:
- Created a new app client
- Changed app client settings
- Or the app client was created without the necessary auth flows

The `ALLOW_USER_PASSWORD_AUTH` flow is **required** for username/password authentication. Without it, Cognito will reject any sign-in attempts with username/password, even if the credentials are correct.

## Still Not Working?

If you've enabled `ALLOW_USER_PASSWORD_AUTH` and it still doesn't work:

1. **Check user status** - Visit `/api/debug-user?email=your-email@example.com`
   - User status should be `CONFIRMED`
   - If it's `UNCONFIRMED`, you need to confirm the email again

2. **Try resetting password** - The password might actually be incorrect
   - Use "Forgot password" on the login page
   - Or manually reset in Cognito Console

3. **Check for typos** - Make sure you're using the exact email and password from sign-up

4. **Wait a few minutes** - Sometimes Cognito needs a moment to propagate changes

## Summary

✅ **Enable `ALLOW_USER_PASSWORD_AUTH` in your Cognito App Client**  
✅ This is a 2-minute fix via AWS Console  
✅ No code changes needed  
✅ Email/password authentication will work immediately after

