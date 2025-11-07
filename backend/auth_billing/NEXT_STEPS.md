# 🎯 Next Steps - Deployment Checklist

## ✅ What's Done

1. ✅ **Post-Confirmation Lambda** - Deployed and working!
   - Google OAuth signups creating DynamoDB records
   - Stripe customers being created
   - Entitlements initialized with `status="none"`

## ⏭️ What's Next

### Step 1: Deploy Stripe Webhook Lambda (15-20 min)

**Purpose**: Handles subscription events from Stripe and updates DynamoDB

**Steps** (from `DEPLOY_VIA_CONSOLE.md` Step 4-6):
1. Create Lambda: `predixa-stripe-webhook`
2. Upload: `stripe_webhook.zip`
3. Handler: `stripe_webhook_lambda.lambda_handler`
4. Environment variables:
   - `USERS_TABLE` = `UserProfiles`
   - `ENTITLEMENTS_TABLE` = `predixa_entitlements`
   - `STRIPE_API_KEY` = Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` = (get after creating webhook in Stripe)
5. Create API Gateway for webhook endpoint
6. Configure Stripe webhook in Stripe Dashboard

**Guide**: Follow `DEPLOY_VIA_CONSOLE.md` starting at **Step 4**

---

### Step 2: Deploy Entitlements API Lambda (15-20 min)

**Purpose**: Provides API endpoint for frontend to check subscription status

**Steps** (from `DEPLOY_VIA_CONSOLE.md` Step 5 & 7):
1. Create Lambda: `predixa-entitlements-api`
2. Upload: `entitlements_api.zip`
3. Handler: `entitlements_api_lambda.lambda_handler`
4. Environment variables:
   - `USERS_TABLE` = `UserProfiles`
   - `ENTITLEMENTS_TABLE` = `predixa_entitlements`
5. Create API Gateway with Cognito Authorizer
6. Get API Gateway URL for frontend

**Guide**: Follow `DEPLOY_VIA_CONSOLE.md` starting at **Step 5** and **Step 7**

---

### Step 3: Configure Stripe Webhook (10 min)

**Purpose**: Connect Stripe to your webhook Lambda

**Steps** (from `DEPLOY_VIA_CONSOLE.md` Step 8):
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint with your API Gateway URL
3. Select 5 events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Get webhook secret (`whsec_...`)
5. Add to Lambda environment variable: `STRIPE_WEBHOOK_SECRET`

**Guide**: Follow `DEPLOY_VIA_CONSOLE.md` **Step 8** or see `STRIPE_WEBHOOK_SETUP.md`

---

### Step 4: Add Frontend Environment Variable (5 min)

**Purpose**: Connect frontend to Entitlements API

**Steps** (from `DEPLOY_VIA_CONSOLE.md` Step 9):
1. Get Entitlements API Gateway URL (from Step 2)
2. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
3. Add: `ENTITLEMENTS_API_GATEWAY_URL` = `https://...execute-api.../prod/me/entitlements`
4. Redeploy Vercel app

**Guide**: Follow `DEPLOY_VIA_CONSOLE.md` **Step 9**

---

## 📋 Quick Reference

### Files You Need
- ✅ `post_confirmation.zip` - Already deployed
- ⏭️ `stripe_webhook.zip` - Ready to deploy
- ⏭️ `entitlements_api.zip` - Ready to deploy

### Documentation
- 📖 `DEPLOY_VIA_CONSOLE.md` - Full deployment guide
- 📖 `STRIPE_WEBHOOK_SETUP.md` - Stripe webhook setup
- 📖 `FIND_WEBHOOK_SECRET.md` - How to get webhook secret
- 📖 `CREATE_COGNITO_AUTHORIZER.md` - API Gateway authorizer setup

### Testing Checklist
After each step, test:
- ✅ Lambda function executes (check CloudWatch Logs)
- ✅ DynamoDB records updated (check tables)
- ✅ API Gateway returns correct responses
- ✅ Stripe webhook receives events (check Stripe Dashboard)

---

## 🎯 Recommended Order

1. **Deploy Stripe Webhook Lambda** (Step 1)
2. **Create API Gateway for Webhook** (Step 1, part 2)
3. **Configure Stripe Webhook** (Step 3)
4. **Deploy Entitlements API Lambda** (Step 2)
5. **Create API Gateway for Entitlements** (Step 2, part 2)
6. **Add Frontend Environment Variable** (Step 4)

**Total Time**: ~1 hour

---

## 🚀 Ready to Start?

**Next Action**: Deploy Stripe Webhook Lambda
- Follow `DEPLOY_VIA_CONSOLE.md` **Step 4**
- Or use the quick reference below

**Quick Start**:
1. Lambda Console → Create function → `predixa-stripe-webhook`
2. Upload `stripe_webhook.zip`
3. Set handler: `stripe_webhook_lambda.lambda_handler`
4. Add environment variables
5. Continue with API Gateway setup

---

**You're doing great! The hardest part (Post-Confirmation) is done. The rest follows the same pattern!** 🎉

