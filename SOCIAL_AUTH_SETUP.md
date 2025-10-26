# Social Authentication Setup Guide

This guide explains how to configure Google and Apple sign-in for your Predixa Web application.

## Changes Made

1. ✅ Updated Amplify configuration to support OAuth
2. ✅ Added Google and Apple sign-in methods to auth store
3. ✅ Added social sign-in buttons to Login and Signup forms
4. ✅ Added OAuth callback handling

## Required Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Existing variables
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id
NEXT_PUBLIC_AWS_REGION=your_aws_region

# New variables for OAuth
NEXT_PUBLIC_COGNITO_DOMAIN=your_cognito_domain.auth.region.amazoncognito.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

For local development:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## AWS Cognito Configuration

### Step 1: Configure OAuth Settings in Cognito

1. Go to AWS Cognito Console
2. Select your User Pool
3. Go to **App integration** tab
4. Under **Hosted UI**, configure:
   - **Allowed callback URLs**: 
     - `http://localhost:3000` (for local development)
     - `https://your-domain.com` (for production)
   - **Allowed sign-out URLs**: Same as above
   - **Identity providers**: Enable Google and Sign in with Apple

### Step 2: Add Google as an Identity Provider

1. In your User Pool, go to **Sign-in experience** → **Federated identity provider sign-in**
2. Click **Add identity provider** → **Google**
3. Enter your Google credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Click **Save**

#### Getting Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Set **Authorized redirect URIs**:
   - `https://your-cognito-domain.auth.region.amazoncognito.com/oauth2/idpresponse`
6. Copy the **Client ID** and **Client Secret**

### Step 3: Add Apple as an Identity Provider

1. In your User Pool, go to **Sign-in experience** → **Federated identity provider sign-in**
2. Click **Add identity provider** → **Sign in with Apple**
3. Enter your Apple credentials:
   - **Client ID**: Your App ID from Apple Developer
   - **Team ID**: Your Apple Team ID
   - **Key ID**: Your Service ID Key ID
   - **Private Key**: Download and paste your private key
4. Click **Save**

#### Getting Apple Credentials

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create a **Service ID**
3. Enable **Sign in with Apple**
4. Register a **Key** for Sign in with Apple
5. Download the key file (can only be downloaded once!)
6. Update your Service ID configuration with the callback URL:
   - `https://your-cognito-domain.auth.region.amazoncognito.com/oauth2/idpresponse`

### Step 4: Configure Attribute Mapping

In Cognito User Pool settings:
1. Go to **Attribute mapping**
2. Map these attributes:
   - **email** → **email**
   - **given_name** → **given_name**
   - **family_name** → **family_name**

## Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your login/signup page
3. You should see:
   - "Continue with Google" button
   - "Continue with Apple" button
   - Email/password form below

4. Click on the social buttons to test authentication

## Troubleshooting

### Issue: "Invalid redirect URI"
- Ensure callback URLs in Cognito match your `NEXT_PUBLIC_APP_URL`
- Check that redirect URLs are added in Google Cloud Console

### Issue: "Invalid client"
- Verify your Google/Apple credentials are correct
- Make sure the OAuth client is enabled in your provider's console

### Issue: Sign-in redirects but doesn't complete
- Check browser console for errors
- Verify `NEXT_PUBLIC_COGNITO_DOMAIN` is set correctly
- Ensure your domain is verified in Cognito

## Production Deployment

Before deploying to production:

1. Update `NEXT_PUBLIC_APP_URL` to your production domain
2. Update callback URLs in Cognito to include production URL
3. Update OAuth provider settings with production callback URLs
4. Deploy the code changes:
   ```bash
   git add .
   git commit -m "Add Google and Apple sign-in"
   git push
   ```

## Security Notes

- Never commit `.env.local` file
- Keep Apple private keys secure
- Use environment variables for all sensitive configuration
- Regularly rotate OAuth credentials

