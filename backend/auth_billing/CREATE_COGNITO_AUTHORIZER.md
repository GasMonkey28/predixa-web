# How to Create Cognito User Pool Authorizer in API Gateway

## The Problem

When creating a method in API Gateway, you might not see "Cognito User Pool Authorizer" in the Authorization dropdown. This is because **you need to create the Authorizer first** before you can use it.

## Solution: Create Authorizer First

### Step 1: Go to Authorizers Section

1. **In API Gateway Console**, select your API (`predixa-entitlements-api`)
2. **Click "Authorizers"** in the left sidebar (under your API name)
3. You should see an empty list or existing authorizers

### Step 2: Create New Authorizer

1. Click **"Create New Authorizer"** button (top right)
2. Fill in the form:
   - **Name**: `CognitoAuthorizer` (or any name you prefer)
   - **Type**: Select **`Cognito`** from dropdown
   - **Cognito User Pool**: Select your User Pool (e.g., `us-east-1_g5anv7`)
   - **Token Source**: `Authorization` (this is the HTTP header name)
3. Click **"Create"**

### Step 3: Verify Authorizer Created

You should now see your authorizer listed:
- ✅ Name: `CognitoAuthorizer`
- ✅ Type: `Cognito`
- ✅ User Pool: Your User Pool ID

### Step 4: Use Authorizer in Method

Now go back to creating your method:

1. **Go to Resources** (click "Resources" in left sidebar)
2. Select your resource (e.g., `/me/entitlements`)
3. Click **Actions** → **Create Method**
4. Select **GET** → Click checkmark
5. **Authorization** dropdown: You should now see **`CognitoAuthorizer`** - Select it!
6. Continue with the rest of the method setup

## Troubleshooting

### Still Don't See Authorizer in Dropdown?

1. **Refresh the page** - Sometimes the UI needs a refresh
2. **Check you're in the right API** - Make sure you're in `predixa-entitlements-api`, not the webhook API
3. **Verify Authorizer was created** - Go back to Authorizers section and confirm it's there
4. **Check User Pool ID** - Make sure you selected the correct Cognito User Pool

### Token Source Explained

- **Token Source**: `Authorization` means the JWT token will be in the `Authorization` header
- Format: `Authorization: Bearer <jwt-token>`
- This is the standard format for Cognito tokens

## Quick Reference

**Authorizer Name**: `CognitoAuthorizer`  
**Type**: `Cognito`  
**User Pool**: Your Cognito User Pool ID  
**Token Source**: `Authorization`  
**Usage**: Select in Method Request → Authorization dropdown

---

**Create the Authorizer first, then you'll see it in the dropdown!** 🎯

