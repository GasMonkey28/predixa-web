# 🚀 Launch Roadmap - Predixa Web

## Overview
This roadmap outlines the steps needed to launch your application with production Stripe integration, free trial implementation, and proper user/subscription tracking.

---

## 📊 Current State Analysis

### What You Have:
✅ **Stripe Integration**: Test mode configured, checkout flow working  
✅ **AWS Cognito**: User authentication working  
✅ **Subscription Checking**: API endpoints to check subscription status  
✅ **Protected Routes**: Basic authentication middleware  

### What's Missing:
❌ **Production Stripe Keys**: Still using test keys  
❌ **Free Trial**: No 2-week free trial for new users  
❌ **Subscription Gating**: Protected routes don't check subscription status  
❌ **Stripe Webhooks**: No webhook handler for subscription events (cancellations, renewals)  
❌ **User Dashboard**: No way to see who's paying vs who has access  
❌ **Trial Tracking**: No system to track trial start/end dates  

---

## 🎯 Roadmap Steps

### PHASE 1: Stripe Production Setup (Day 1)

#### 1.1 Get Production Stripe Keys
- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com) → Toggle to **Live Mode** (top right)
- [ ] Navigate to **Developers** → **API keys**
- [ ] Copy your **Live Publishable Key** (starts with `pk_live_`)
- [ ] Copy your **Live Secret Key** (starts with `sk_live_`)
- [ ] **Important**: Keep test keys for development, use live keys for production

#### 1.2 Update Environment Variables in Vercel
- [ ] Go to your Vercel project → **Settings** → **Environment Variables**
- [ ] Update `STRIPE_SECRET_KEY` to production key (`sk_live_...`)
- [ ] Update `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to production key (`pk_live_...`)
- [ ] Set scope to **Production** only (keep test keys for Preview/Development)
- [ ] Redeploy your application

#### 1.3 Create Production Products in Stripe
- [ ] In **Live Mode**, go to **Products**
- [ ] Create/verify your subscription products:
  - Monthly Pro (e.g., $19.99/month)
  - Yearly Pro (e.g., $179.99/year)
- [ ] Note down the **Production Price IDs** (different from test Price IDs)

#### 1.4 Configure Stripe Billing Portal (Live Mode)
- [ ] Go to **Settings** → **Billing** → **Customer portal** (in Live Mode)
- [ ] Configure portal settings:
  - Allow customers to cancel subscriptions ✅
  - Allow customers to update payment methods ✅
  - Allow customers to view invoices ✅
- [ ] Save configuration

---

### PHASE 2: Free Trial Implementation (Day 1-2)

#### 2.1 Create Trial Tracking System
**Option A: Use Stripe's Built-in Trial Period** (Recommended)
- Stripe handles trial tracking automatically
- No additional database needed
- Trial status visible in Stripe dashboard

**Option B: Custom Trial Tracking** (More Control)
- Store trial start date in Cognito custom attributes or DynamoDB
- Check trial status in your subscription service
- More complex but gives you full control

#### 2.2 Implement Trial in Checkout Session
- [ ] Modify `src/app/api/stripe/create-checkout-session/route.ts`
- [ ] Add trial period logic:
  ```typescript
  // Check if user is eligible for free trial (new user, no previous subscription)
  const hasPreviousSubscription = existingSubscriptions.data.length > 0
  
  if (!hasPreviousSubscription) {
    sessionConfig.subscription_data = {
      trial_period_days: 7, // 1-week free trial
    }
  }
  ```

#### 2.3 Update Subscription Status Check
- [ ] Modify `src/lib/subscription-service.ts` to handle trial status
- [ ] Stripe subscriptions with active trials have `status: 'trialing'`
- [ ] Grant access during trial period

#### 2.4 Update Access Control Logic
- [ ] Modify middleware or subscription checks to allow access during trial
- [ ] Trial users should have the same access as paying subscribers

---

### PHASE 3: Subscription Gating (Day 2)

#### 3.1 Update Middleware to Check Subscription
- [ ] Modify `middleware.ts` to check subscription status for protected routes
- [ ] Allow access if:
  - User has active subscription (`status: 'active'`)
  - User is in trial period (`status: 'trialing'`)
- [ ] Redirect to account/subscribe page if no active subscription or trial

#### 3.2 Update ProtectedRoute Component
- [ ] Modify `src/components/auth/ProtectedRoute.tsx`
- [ ] Add subscription check after authentication check
- [ ] Show subscription required message if no access

#### 3.3 Create Subscription Required Page
- [ ] Create a new page/component for users without subscription
- [ ] Show subscription options and trial information
- [ ] Link to account page for subscription

---

### PHASE 4: Stripe Webhooks (Day 2-3)

#### 4.1 Create Webhook Endpoint
- [ ] Create `src/app/api/stripe/webhook/route.ts`
- [ ] Implement webhook signature verification
- [ ] Handle key events:
  - `customer.subscription.created` - New subscription
  - `customer.subscription.updated` - Subscription changed (upgrade/downgrade)
  - `customer.subscription.deleted` - Subscription canceled
  - `invoice.payment_succeeded` - Successful payment
  - `invoice.payment_failed` - Failed payment

#### 4.2 Configure Webhook in Stripe Dashboard
- [ ] Go to **Developers** → **Webhooks** (in Live Mode)
- [ ] Click **Add endpoint**
- [ ] Enter URL: `https://your-domain.vercel.app/api/stripe/webhook`
- [ ] Select events to listen to (see above)
- [ ] Copy webhook signing secret
- [ ] Add `STRIPE_WEBHOOK_SECRET` to Vercel environment variables

#### 4.3 Update User Access on Webhook Events
- [ ] When subscription canceled → Revoke access immediately or at period end
- [ ] When payment failed → Handle grace period (if applicable)
- [ ] When subscription renewed → Update access status

---

### PHASE 5: User & Subscription Tracking (Day 3)

#### 5.1 Understanding Your Data Sources

**AWS Cognito:**
- Shows: All users who signed up
- Shows: Last sign-in time (if enabled)
- Does NOT show: Subscription status
- Does NOT show: Payment status

**Stripe Dashboard:**
- Shows: All customers with subscriptions
- Shows: Payment history
- Shows: Subscription status (active, canceled, trialing, etc.)
- Shows: Customer metadata (Cognito user ID)

#### 5.2 Create Admin Dashboard (Optional but Recommended)

**Option A: Use Stripe Dashboard + Cognito Console**
- Stripe Dashboard → Customers → Search by metadata `cognito_user_id`
- Cognito Console → Users → Search by user ID
- Manual cross-reference (time-consuming but requires no code)

**Option B: Build Custom Admin Dashboard** (Better for scale)
- Create admin page: `/admin/users`
- Query Stripe API for all customers
- Query Cognito for all users
- Display unified view:
  - User email (from Cognito)
  - Cognito User ID
  - Stripe Customer ID
  - Subscription status
  - Trial status
  - Last payment date
  - Last sign-in date

#### 5.3 Track User Access Logs
- [ ] Add logging when users access protected routes
- [ ] Store access attempts (optional, for analytics)
- [ ] Log subscription status at time of access

---

### PHASE 6: Testing & Validation (Day 3-4)

#### 6.1 Test Production Stripe Flow
- [ ] Test subscription checkout with real payment method (test with small amount first)
- [ ] Verify trial period works correctly
- [ ] Test subscription cancellation
- [ ] Test payment method update
- [ ] Verify webhook events are received

#### 6.2 Test Access Control
- [ ] New user signup → Should get trial access
- [ ] Trial expiration → Should lose access
- [ ] Active subscriber → Should have access
- [ ] Canceled subscription → Should lose access (at period end)

#### 6.3 Test Edge Cases
- [ ] User with expired trial trying to access
- [ ] Payment failure handling
- [ ] Subscription renewal
- [ ] Multiple subscriptions (should prevent)

---

### PHASE 7: Monitoring & Analytics (Day 4)

#### 7.1 Set Up Monitoring
- [ ] Monitor Stripe webhook delivery in Stripe Dashboard
- [ ] Set up error alerts for failed webhooks
- [ ] Monitor subscription churn rate
- [ ] Track trial-to-paid conversion rate

#### 7.2 Analytics Setup
- [ ] Track key metrics:
  - Total signups (Cognito)
  - Active trials (Stripe)
  - Active subscriptions (Stripe)
  - Trial conversion rate
  - Revenue (Stripe Dashboard)

---

## 🔍 How to Track Users & Payments

### Understanding Your Current Setup:

1. **Who Signed Up?**
   - **AWS Cognito Console** → Users → Shows all registered users
   - Can see: Email, Sign-up date, Last sign-in (if enabled)

2. **Who is Paying?**
   - **Stripe Dashboard** → Customers → Shows all customers with subscriptions
   - Can see: Email, Subscription status, Payment history
   - Each customer has metadata: `cognito_user_id` (links to Cognito)

3. **Who Has Access?**
   - Currently: Anyone authenticated (NOT gated by subscription)
   - After Phase 3: Only users with active subscription OR active trial

### Quick Reference:

**Cognito User ID → Stripe Customer:**
1. Go to Stripe Dashboard → Customers
2. Search: `metadata['cognito_user_id']:'USER_ID_HERE'`
3. Find the customer and see their subscription

**Stripe Customer → Cognito User:**
1. Get `cognito_user_id` from Stripe customer metadata
2. Go to Cognito Console → Users
3. Search by user ID

**Who Has Access Right Now?**
- Check Stripe for active subscriptions or trialing subscriptions
- Cross-reference with Cognito to get user emails

---

## 📝 Implementation Priority

### Must Have Before Launch:
1. ✅ **Phase 1**: Stripe Production Setup
2. ✅ **Phase 2**: Free Trial Implementation
3. ✅ **Phase 3**: Subscription Gating
4. ✅ **Phase 4**: Stripe Webhooks (at least basic events)

### Nice to Have:
5. **Phase 5**: Admin Dashboard (can build later)
6. **Phase 7**: Advanced Monitoring (can add later)

---

## 🚨 Important Notes

### Before Switching to Production:
- ⚠️ **Test thoroughly in test mode first**
- ⚠️ **Keep test keys for development**
- ⚠️ **Use production keys ONLY in production environment**
- ⚠️ **Test with small real payment first** ($1 if possible)

### Trial Period Considerations:
- Users can cancel during trial (no charge)
- Trial converts to paid automatically at end
- Consider sending reminder emails 2-3 days before trial ends

### Access Control:
- Current middleware only checks authentication
- After Phase 3, it will check subscription status
- Users without subscription will see subscribe page

---

## 📚 Additional Resources

- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Trial Periods](https://stripe.com/docs/billing/subscriptions/trials)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [AWS Cognito User Management](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managing-users.html)

---

## ✅ Pre-Launch Checklist

- [ ] Stripe production keys configured in Vercel
- [ ] Production products created in Stripe
- [ ] Free trial implemented and tested
- [ ] Subscription gating working on protected routes
- [ ] Stripe webhook endpoint created and configured
- [ ] Tested subscription flow end-to-end
- [ ] Tested trial expiration flow
- [ ] Tested subscription cancellation
- [ ] Monitoring set up
- [ ] Documentation updated

---

**Ready to start? Begin with Phase 1!**

