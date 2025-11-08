# Customer Data Connections: Cognito ↔ DynamoDB ↔ Stripe

This document explains how customer information flows between AWS Cognito, DynamoDB UserProfiles, and Stripe customers.

## Overview

Your system uses **three interconnected data stores**:

1. **AWS Cognito** - Authentication & user identity
2. **DynamoDB UserProfiles** - User profile data & Stripe customer ID
3. **Stripe** - Payment & subscription management

## The Connection Flow

```
┌─────────────┐
│   Cognito   │ ← Primary source of truth for user identity
│   (Auth)    │   - User ID (sub/userName) is the master key
└──────┬──────┘
       │
       │ userId (cognito_sub)
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  DynamoDB   │    │   Stripe    │    │  Entitlements│
│ UserProfiles│    │  Customers  │    │   (DynamoDB) │
└─────────────┘    └─────────────┘    └─────────────┘
  - userId (PK)      - metadata:         - cognito_sub (PK)
  - stripeCustomerId   cognito_user_id   - status
  - email              - customer.id     - plan
  - givenName                            - current_period_end
  - familyName
```

## Key Identifiers

### Primary Key: Cognito User ID
- **Format**: `cognito-sub-uuid` (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
- **Location**: 
  - Cognito: `userName` or `sub` attribute
  - DynamoDB: `userId` (partition key)
  - Stripe: `metadata.cognito_user_id`

### Secondary Key: Stripe Customer ID
- **Format**: `cus_xxxxxxxxxxxxx`
- **Location**:
  - Stripe: `customer.id`
  - DynamoDB: `stripeCustomerId` field
  - Used to link subscriptions and payments

## Connection Points

### 1. Cognito → DynamoDB Connection

**Link**: Cognito User ID (`sub`/`userName`) → DynamoDB `userId` (partition key)

**How it works**:
- When a user signs up, the **Post-Confirmation Lambda** (`backend/auth_billing/post_confirmation_lambda.py`) automatically:
  1. Extracts `cognito_sub` from the Cognito event
  2. Creates a record in DynamoDB `UserProfiles` table with `userId = cognito_sub`
  3. Stores profile data (email, name, etc.)

**Code Reference**:
```python
# backend/auth_billing/post_confirmation_lambda.py
cognito_sub = event.get("userName") or user_attrs.get("sub")
put_user(
    cognito_sub=cognito_sub,
    email=email,
    stripe_customer_id=stripe_customer_id,
    **extra_fields
)
```

**DynamoDB Schema**:
```json
{
  "userId": "cognito-sub-uuid",  // ← Links to Cognito
  "email": "user@example.com",
  "givenName": "John",
  "familyName": "Doe",
  "stripeCustomerId": "cus_xxx",  // ← Links to Stripe
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 2. Cognito → Stripe Connection

**Link**: Cognito User ID → Stripe Customer `metadata.cognito_user_id`

**How it works**:
- When a user signs up, the Post-Confirmation Lambda creates a Stripe customer
- The Cognito user ID is stored in Stripe customer metadata
- When creating checkout sessions, the system searches Stripe by `metadata.cognito_user_id`

**Code Reference**:
```python
# backend/auth_billing/post_confirmation_lambda.py
customer = stripe.Customer.create(
    email=email,
    metadata={
        "cognito_sub": cognito_sub,  # ← Links to Cognito
        "platform": "web",
        "created_via": "post_confirmation_trigger"
    }
)
```

**Stripe Customer Object**:
```json
{
  "id": "cus_xxxxxxxxxxxxx",
  "email": "user@example.com",
  "metadata": {
    "cognito_sub": "cognito-sub-uuid",  // ← Links to Cognito
    "platform": "web"
  }
}
```

### 3. DynamoDB → Stripe Connection

**Link**: DynamoDB `stripeCustomerId` → Stripe `customer.id`

**How it works**:
- When a Stripe customer is created, the customer ID is stored in DynamoDB
- This allows quick lookup: given a Cognito user ID, you can find their Stripe customer
- The connection is bidirectional:
  - **DynamoDB → Stripe**: Use `stripeCustomerId` to fetch customer from Stripe
  - **Stripe → DynamoDB**: Use `metadata.cognito_user_id` to find DynamoDB record

**Code Reference**:
```python
# backend/auth_billing/ddb.py
item = {
    "userId": cognito_sub,
    "email": email,
    "stripeCustomerId": stripe_customer_id,  # ← Links to Stripe
    ...
}
```

**Frontend Lookup**:
```typescript
// src/lib/stripe-helpers.ts
// Search Stripe by Cognito user ID
const existingCustomers = await stripe.customers.search({
  query: `metadata['cognito_user_id']:'${cognitoUserId}'`,
  limit: 1
})
```

## Complete User Journey

### Step 1: User Signs Up
```
User signs up via email/Google/Apple
    ↓
Cognito creates user account
    ↓
Post-Confirmation Lambda triggered
    ↓
┌─────────────────────────────────────┐
│ 1. Create Stripe Customer           │
│    - Email: user@example.com        │
│    - Metadata: cognito_sub = "xxx"  │
│    - Returns: cus_abc123           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. Create DynamoDB UserProfile     │
│    - userId: "xxx" (from Cognito)   │
│    - email: user@example.com        │
│    - stripeCustomerId: "cus_abc123" │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Initialize Entitlements         │
│    - cognito_sub: "xxx"             │
│    - status: "none"                 │
└─────────────────────────────────────┘
```

### Step 2: User Subscribes
```
User clicks "Subscribe"
    ↓
Frontend calls /api/stripe/create-checkout-session
    ↓
getOrCreateStripeCustomer() searches:
    - Stripe: metadata['cognito_user_id'] = userId
    - If found: use existing customer
    - If not: create new customer
    ↓
Stripe Checkout Session created
    - customer: cus_abc123
    - Links to subscription
```

### Step 3: Subscription Webhook
```
Stripe sends webhook (subscription.created)
    ↓
Webhook handler receives event
    ↓
Extract customer ID from event
    ↓
Search DynamoDB by stripeCustomerId OR
Search Stripe metadata for cognito_user_id
    ↓
Update DynamoDB Entitlements table
    - cognito_sub: "xxx"
    - status: "active"
    - plan: "premium"
```

## Data Lookup Patterns

### Pattern 1: Cognito User ID → Everything Else
```typescript
// Given: Cognito user ID
const cognitoUserId = "a1b2c3d4-..."

// 1. Get DynamoDB profile
const profile = await dynamodb.get({
  Key: { userId: cognitoUserId }
})

// 2. Get Stripe customer
const customers = await stripe.customers.search({
  query: `metadata['cognito_user_id']:'${cognitoUserId}'`
})

// 3. Get entitlements
const entitlements = await dynamodb.get({
  Key: { cognito_sub: cognitoUserId }
})
```

### Pattern 2: Stripe Customer ID → Cognito User
```typescript
// Given: Stripe customer ID
const stripeCustomerId = "cus_abc123"

// 1. Get Stripe customer
const customer = await stripe.customers.retrieve(stripeCustomerId)

// 2. Extract Cognito user ID from metadata
const cognitoUserId = customer.metadata.cognito_user_id

// 3. Get DynamoDB profile
const profile = await dynamodb.get({
  Key: { userId: cognitoUserId }
})
```

### Pattern 3: Email → User (if needed)
```typescript
// Given: Email address
const email = "user@example.com"

// 1. Search DynamoDB by email (requires GSI)
const profiles = await dynamodb.query({
  IndexName: "EmailIndex",
  KeyConditionExpression: "email = :email",
  ExpressionAttributeValues: { ":email": email }
})

// 2. Or search Stripe by email
const customers = await stripe.customers.list({
  email: email
})

// 3. Then use cognito_user_id from metadata
```

## Important Notes

### 1. Single Source of Truth
- **Cognito User ID** is the primary identifier
- All other systems reference it
- Never create duplicate users with the same Cognito ID

### 2. Stripe Customer Creation
- Happens automatically during signup (Post-Confirmation Lambda)
- Also happens on-demand during checkout if missing
- Always includes `cognito_user_id` in metadata

### 3. DynamoDB Profile Updates
- Profile data (name, email) can be updated independently
- `stripeCustomerId` is set once and rarely changes
- If Stripe customer is deleted, `stripeCustomerId` should be cleared

### 4. Error Handling
- If Stripe customer creation fails, user profile is still created
- If DynamoDB write fails, user can still sign in (Cognito works)
- System is designed to be resilient to partial failures

## Troubleshooting

### Issue: User exists in Cognito but not in DynamoDB
**Solution**: Run the sync script:
```bash
npm run sync-profiles
```

### Issue: Stripe customer exists but not linked to DynamoDB
**Solution**: Update DynamoDB profile:
```typescript
await dynamodb.update({
  Key: { userId: cognitoUserId },
  UpdateExpression: "SET stripeCustomerId = :sid",
  ExpressionAttributeValues: { ":sid": stripeCustomerId }
})
```

### Issue: Multiple Stripe customers for same user
**Solution**: Search by `metadata.cognito_user_id` and merge/delete duplicates

### Issue: Missing stripeCustomerId in DynamoDB
**Solution**: 
1. Search Stripe by `metadata.cognito_user_id`
2. Update DynamoDB with the found customer ID

## Summary

**The connection chain**:
```
Cognito User ID (master key)
    ├─→ DynamoDB UserProfiles.userId
    ├─→ Stripe Customer.metadata.cognito_user_id
    └─→ DynamoDB Entitlements.cognito_sub

Stripe Customer ID (secondary key)
    ├─→ DynamoDB UserProfiles.stripeCustomerId
    └─→ Stripe Subscriptions.customer
```

**All three systems are connected through the Cognito User ID**, which serves as the primary identifier that links everything together.

---

## Popular Customer Data Management Approaches

### Comparison of Industry Approaches

#### 1. **Your Current Approach: Cognito + DynamoDB + Stripe** ✅ (Recommended)
**Used by**: Airbnb, Slack, most modern SaaS apps

**Architecture**:
```
Cognito (Auth) → DynamoDB (Profiles) → Stripe (Payments)
```

**Pros**:
- ✅ Scalable (handles millions of users)
- ✅ No permission issues (DynamoDB allows user updates)
- ✅ Flexible schema (easy to add fields)
- ✅ Serverless (no database management)
- ✅ Fast lookups (DynamoDB is optimized for this)
- ✅ Industry standard for SaaS apps

**Cons**:
- ⚠️ Requires AWS knowledge
- ⚠️ DynamoDB query patterns need planning (GSIs)

**Best for**: Modern SaaS apps, high-scale applications, serverless architectures

---

#### 2. **Cognito Only** ❌ (Not Recommended)
**Used by**: Simple apps, prototypes

**Architecture**:
```
Cognito (Auth + Profiles)
```

**Pros**:
- ✅ Simple setup
- ✅ One service to manage

**Cons**:
- ❌ Permission issues (users can't update attributes)
- ❌ Limited to basic fields
- ❌ Hard to extend
- ❌ Different behavior for OAuth vs email
- ❌ Can't query efficiently

**Best for**: Prototypes only, not production

---

#### 3. **Cognito + RDS PostgreSQL** ⚠️ (Overkill for Most)
**Used by**: Enterprise apps with complex relational data

**Architecture**:
```
Cognito (Auth) → PostgreSQL (Profiles + Complex Data)
```

**Pros**:
- ✅ SQL queries (familiar)
- ✅ ACID transactions
- ✅ Complex relationships

**Cons**:
- ❌ Connection pooling needed
- ❌ More maintenance
- ❌ Overkill for simple profiles
- ❌ Slower than DynamoDB for simple lookups
- ❌ More expensive

**Best for**: Enterprise apps with complex relational data

---

#### 4. **Auth0 + Custom Database** ⚠️ (Alternative)
**Used by**: Some enterprise apps

**Architecture**:
```
Auth0 (Auth) → Your Database (Profiles)
```

**Pros**:
- ✅ More flexible than Cognito
- ✅ Better OAuth handling

**Cons**:
- ❌ More expensive than Cognito
- ❌ Still need to manage database
- ❌ Vendor lock-in

**Best for**: If you need more flexibility than Cognito

---

### **Recommendation: Stick with Your Current Approach** ✅

Your **Cognito + DynamoDB + Stripe** architecture is:
- ✅ Industry best practice
- ✅ Scalable to millions of users
- ✅ Cost-effective
- ✅ Serverless (no infrastructure management)
- ✅ Used by major SaaS companies

**No changes needed** - your architecture is solid!

---

## Duplicate Email Prevention

### The Problem

**Current Issue**: Users can create **two separate accounts** with the same email:
1. One account via **email/password signup**
2. Another account via **Google Sign-In** (same Gmail address)

This creates:
- ❌ Duplicate Stripe customers
- ❌ Confusion about which account has subscription
- ❌ Poor user experience
- ❌ Data fragmentation

### Why This Happens

**Cognito Behavior**:
- Email/password signup: Creates user with `username = email`
- Google Sign-In: Creates user with `username = Google sub` (different ID)
- **Cognito allows both** because they have different `username` values

### Solutions

#### **Solution 1: Pre-Signup Lambda (Recommended)** ✅

**How it works**:
1. Before user signs up, check if email exists
2. If email exists, link accounts or prevent signup
3. Show user: "Account exists, sign in instead"

**Implementation**:

**Step 1**: Create Pre-Signup Lambda Trigger

```python
# backend/auth_billing/pre_signup_lambda.py
"""
Cognito Pre-Signup Lambda Trigger

Prevents duplicate emails by checking if email already exists.
If found, links accounts or prevents signup.
"""
import json
import boto3
from typing import Dict, Any

cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table('UserProfiles')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Pre-signup trigger to prevent duplicate emails.
    """
    user_attrs = event.get("request", {}).get("userAttributes", {})
    email = user_attrs.get("email", "").lower()
    trigger_source = event.get("triggerSource", "")
    
    print(f"🔍 Pre-Signup: email={email}, source={trigger_source}")
    
    # Check if email exists in DynamoDB
    try:
        # Query by email using GSI (requires EmailIndex)
        response = users_table.query(
            IndexName="EmailIndex",
            KeyConditionExpression="email = :email",
            ExpressionAttributeValues={":email": email}
        )
        
        if response.get("Items"):
            existing_user = response["Items"][0]
            existing_cognito_sub = existing_user["userId"]
            
            print(f"⚠️ Email {email} already exists for user {existing_cognito_sub}")
            
            # Option A: Prevent signup (show error)
            if trigger_source == "PreSignUp_ExternalProvider":
                # Google/Apple sign-in - link to existing account
                # This requires account linking (see Solution 2)
                print("ℹ️ External provider signup - would link to existing account")
            else:
                # Email/password signup - prevent duplicate
                raise Exception(f"An account with email {email} already exists. Please sign in instead.")
    
    except Exception as e:
        print(f"❌ Error checking email: {e}")
        # Allow signup if check fails (fail open)
        pass
    
    return event
```

**Step 2**: Add Email GSI to DynamoDB

```bash
# Create EmailIndex Global Secondary Index
aws dynamodb update-table \
  --table-name UserProfiles \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --global-secondary-index-updates \
    "[{
      \"Create\": {
        \"IndexName\": \"EmailIndex\",
        \"KeySchema\": [{\"AttributeName\": \"email\", \"KeyType\": \"HASH\"}],
        \"Projection\": {\"ProjectionType\": \"ALL\"},
        \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}
      }
    }]"
```

**Step 3**: Attach Lambda to Cognito User Pool

```bash
# Attach pre-signup trigger
aws cognito-idp update-user-pool \
  --user-pool-id YOUR_USER_POOL_ID \
  --lambda-config PreSignUp=arn:aws:lambda:us-east-1:ACCOUNT:function:pre-signup-lambda
```

---

#### **Solution 2: Account Linking (Advanced)** 🔗

**How it works**:
1. When user signs in with Google, check if email exists
2. If email exists, link Google identity to existing account
3. User can sign in with either method

**Implementation**:

```python
# In pre-signup or post-confirmation lambda
def link_external_provider_to_existing_account(
    email: str,
    external_provider: str,  # "Google" or "Apple"
    external_user_id: str
):
    """
    Link external provider (Google/Apple) to existing email/password account.
    """
    # 1. Find existing account by email
    existing_user = find_user_by_email(email)
    
    if existing_user:
        # 2. Link external provider to existing Cognito user
        cognito.admin_link_provider_for_user(
            UserPoolId=USER_POOL_ID,
            DestinationUser={
                'ProviderName': 'Cognito',
                'ProviderAttributeValue': existing_user['userId']
            },
            SourceUser={
                'ProviderName': external_provider,
                'ProviderAttributeName': 'Cognito_Subject',
                'ProviderAttributeValue': external_user_id
            }
        )
        
        return existing_user['userId']
    
    return None
```

**Note**: Account linking is complex and requires careful implementation.

---

#### **Solution 3: Frontend Check (Simple)** ⚠️

**How it works**:
1. Before signup, check if email exists via API
2. Show error if email exists
3. Prevent form submission

**Implementation**:

```typescript
// src/components/auth/SignupForm.tsx
const checkEmailExists = async (email: string) => {
  try {
    const response = await fetch(`/api/user/check-email?email=${encodeURIComponent(email)}`)
    const { exists } = await response.json()
    return exists
  } catch (error) {
    console.error('Error checking email:', error)
    return false
  }
}

// In signup handler
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // Check if email exists
  const emailExists = await checkEmailExists(email)
  if (emailExists) {
    toast.error('An account with this email already exists. Please sign in instead.')
    return
  }
  
  // Proceed with signup
  await signUp(email, password, givenName, familyName)
}
```

**API Endpoint**:

```typescript
// src/app/api/user/check-email/route.ts
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }
  
  // Query DynamoDB by email (requires EmailIndex GSI)
  const result = await docClient.query({
    TableName: 'UserProfiles',
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email.toLowerCase() }
  })
  
  return NextResponse.json({ exists: result.Items.length > 0 })
}
```

**Limitation**: This only prevents email/password duplicates. Google sign-in still creates separate accounts.

---

### **Recommended Solution: Pre-Signup Lambda + Email GSI** ✅

**Why**:
- ✅ Prevents duplicates at the source (Cognito)
- ✅ Works for both email and Google sign-in
- ✅ Server-side validation (can't be bypassed)
- ✅ Industry standard approach

**Steps**:
1. ✅ Create EmailIndex GSI on UserProfiles table
2. ✅ Create Pre-Signup Lambda function
3. ✅ Attach Lambda to Cognito User Pool
4. ✅ Test with duplicate emails

---

## Email in predixa_entitlements Table

### Current Structure

**predixa_entitlements table** currently stores:
```json
{
  "cognito_sub": "uuid",           // Partition Key
  "status": "active|none|...",     // Subscription status
  "plan": "premium|basic|...",     // Plan name
  "current_period_end": 1234567890, // Unix timestamp
  "trial_expires_at": 1234567890,   // Unix timestamp
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**No email field** ❌

### Do You Need Email in Entitlements?

#### **Short Answer: No, you don't need it** ✅

**Why**:
1. ✅ **Email is already in UserProfiles** - You can join via `cognito_sub`
2. ✅ **Single source of truth** - Email belongs in UserProfiles, not entitlements
3. ✅ **Normalized data** - Avoids duplication
4. ✅ **Simpler queries** - Get entitlements by `cognito_sub`, then get email from UserProfiles

#### **When You Might Want Email in Entitlements**:

**Use Case 1: Quick Lookups Without Joins**
```typescript
// If you frequently need: "Get all active subscribers' emails"
// Without email in entitlements:
const entitlements = await getActiveEntitlements()
const emails = await Promise.all(
  entitlements.map(e => getUserProfile(e.cognito_sub).then(p => p.email))
)

// With email in entitlements:
const entitlements = await getActiveEntitlements()
const emails = entitlements.map(e => e.email) // Direct access
```

**Use Case 2: Email Notifications from Webhooks**
```typescript
// Stripe webhook → Update entitlements → Send email
// If email is in entitlements, you don't need to query UserProfiles
```

**Use Case 3: Analytics/Reporting**
```typescript
// "Show me all premium subscribers' emails"
// Easier if email is in entitlements table
```

---

### **Recommendation: Add Email (Optional but Helpful)** ✅

**Why add it**:
- ✅ Faster lookups (no join needed)
- ✅ Convenient for webhooks/notifications
- ✅ Better for analytics
- ✅ Small storage cost (email is tiny)

**How to add it**:

**Step 1**: Update `update_entitlement()` function

```python
# backend/auth_billing/ddb.py
def update_entitlement(
    cognito_sub: str,
    status: str,
    plan: Optional[str] = None,
    current_period_end: Optional[int] = None,
    trial_expires_at: Optional[int] = None,
    email: Optional[str] = None  # ← Add email parameter
) -> bool:
    # ... existing code ...
    
    if email is not None:
        update_expr += ", email = :email"
        expr_attrs[":email"] = email.lower()  # Normalize email
```

**Step 2**: Update Post-Confirmation Lambda

```python
# backend/auth_billing/post_confirmation_lambda.py
# When initializing entitlements:
init_entitlement(
    cognito_sub=cognito_sub,
    email=email  # ← Pass email
)
```

**Step 3**: Update Webhook Handler

```python
# When updating entitlements from Stripe webhook:
# Get email from Stripe customer
customer = stripe.Customers.retrieve(customer_id)
email = customer.email

update_entitlement(
    cognito_sub=cognito_sub,
    status="active",
    plan="premium",
    email=email  # ← Include email
)
```

**Step 4**: Backfill Existing Records (Optional)

```python
# Script to add email to existing entitlements
import boto3

dynamodb = boto3.resource('dynamodb')
entitlements_table = dynamodb.Table('predixa_entitlements')
users_table = dynamodb.Table('UserProfiles')

# Scan all entitlements
response = entitlements_table.scan()
for item in response['Items']:
    cognito_sub = item['cognito_sub']
    
    # Get email from UserProfiles
    user = users_table.get_item(Key={'userId': cognito_sub})
    if 'Item' in user and 'email' in user['Item']:
        email = user['Item']['email']
        
        # Update entitlements with email
        entitlements_table.update_item(
            Key={'cognito_sub': cognito_sub},
            UpdateExpression='SET email = :email',
            ExpressionAttributeValues={':email': email}
        )
        print(f"✅ Updated {cognito_sub} with email {email}")
```

---

### **Final Recommendation**

**For your use case**:
- ✅ **Add email to entitlements** - It's helpful and low cost
- ✅ **Keep email in UserProfiles** - Still the primary source
- ✅ **Use email in entitlements for convenience** - Faster lookups, easier webhooks

**Updated entitlements schema**:
```json
{
  "cognito_sub": "uuid",           // Partition Key
  "email": "user@example.com",     // ← Add this (optional but recommended)
  "status": "active|none|...",
  "plan": "premium|basic|...",
  "current_period_end": 1234567890,
  "trial_expires_at": 1234567890,
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## Summary

### ✅ **Architecture**: Your current approach is industry best practice
- Cognito + DynamoDB + Stripe is the right choice
- No changes needed to architecture

### ✅ **Duplicate Emails**: Implement Pre-Signup Lambda
- Create EmailIndex GSI on UserProfiles
- Add Pre-Signup Lambda to check for existing emails
- Prevent duplicate accounts at signup

### ✅ **Email in Entitlements**: Add it (optional but helpful)
- Faster lookups
- Easier webhook handling
- Small storage cost
- Keep email in UserProfiles as primary source

**Next Steps**:
1. Create EmailIndex GSI on UserProfiles table
2. Implement Pre-Signup Lambda for duplicate prevention
3. (Optional) Add email field to entitlements table

