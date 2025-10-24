# Subscription Setup Guide

This guide explains how to set up Stripe subscriptions for the Predixa web application.

## Overview

The application uses:
- **Stripe** for payment processing and subscription management
- **AWS Cognito** for user authentication
- **Vercel** for deployment

## 1. Stripe Setup

### 1.1 Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete the account setup process
3. Get your API keys from the Stripe Dashboard

### 1.2 Create Products and Prices
1. In Stripe Dashboard, go to "Products"
2. Create a new product called "Monthly Pro" with price $19.99/month
3. Create a new product called "Yearly Pro" with price $179.99/year
4. Note down the Price IDs (they start with `price_`)

### 1.3 Get API Keys
1. In Stripe Dashboard, go to "Developers" > "API keys"
2. Copy your:
   - **Publishable key** (starts with `pk_test_` for test mode)
   - **Secret key** (starts with `sk_test_` for test mode)

## 2. AWS Cognito Setup

### 2.1 Create User Pool
1. Go to AWS Cognito Console
2. Create a new User Pool
3. Note down:
   - **User Pool ID** (format: `us-east-1_XXXXXXXXX`)
   - **Client ID** (format: `xxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Region** (e.g., `us-east-1`)

## 3. Environment Variables

### 3.1 Local Development (.env.local)
Create a `.env.local` file in your project root:

```bash
# AWS Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id
NEXT_PUBLIC_AWS_REGION=your_region

# AWS SDK (for server-side operations)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

### 3.2 Vercel Production
Add the same environment variables in your Vercel project settings:
1. Go to your Vercel project dashboard
2. Click "Settings" > "Environment Variables"
3. Add each variable with the appropriate value
4. Set scope to "Production" (or "All Environments")

## 4. Testing

### 4.1 Test Mode
- Use Stripe test keys (start with `pk_test_` and `sk_test_`)
- Use test card numbers from [Stripe's testing guide](https://stripe.com/docs/testing)
- No real charges will be made

### 4.2 Test Cards
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

## 5. Deployment

### 5.1 Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel settings
3. Deploy the application
4. Test the subscription flow on the deployed URL

### 5.2 Production Checklist
- [ ] Stripe keys are set to live mode
- [ ] All environment variables are configured
- [ ] Test subscription flow works
- [ ] Webhook endpoints are configured (if needed)

## 6. Troubleshooting

### Common Issues
1. **"User not authenticated"**: Check AWS Cognito configuration
2. **"No such price"**: Verify Stripe Price IDs are correct
3. **"API key should be a string"**: Check environment variable format
4. **Build errors**: Ensure all required environment variables are set

### Debug Steps
1. Check browser console for client-side errors
2. Check Vercel function logs for server-side errors
3. Verify environment variables are loaded correctly
4. Test with Stripe test mode first

## 7. Security Notes

- Never commit real API keys to version control
- Use `.env.local` for local development
- Use Vercel environment variables for production
- Regularly rotate API keys
- Monitor for unauthorized usage

## 8. Support

For issues with:
- **Stripe**: Check [Stripe Documentation](https://stripe.com/docs)
- **AWS Cognito**: Check [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- **Vercel**: Check [Vercel Documentation](https://vercel.com/docs)
