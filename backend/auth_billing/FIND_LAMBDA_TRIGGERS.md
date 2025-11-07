# How to Find Lambda Triggers in Cognito

## Important: You're in the Wrong Place!

You're currently viewing an **App Client** page. Lambda triggers are configured at the **User Pool** level, not App Client level.

## Correct Navigation Path

### Step 1: Go to User Pool Level

From where you are now (App Client page):

1. **Look at the breadcrumbs** at the top:
   ```
   Amazon Cognito > User pools > User pool - g5anv7 > App clients > App client: predixa
   ```

2. **Click on "User pool - g5anv7"** in the breadcrumbs (or go back)

   OR

3. **Look at the left sidebar** - you should see:
   - **Current user pool:** `User pool - g5anv7` (this is a dropdown/header)
   - Click on the User Pool name to go to the User Pool overview

### Step 2: Find Lambda Triggers

Once you're at the **User Pool** level (not App Client), look in the left sidebar for:

**Option A: Direct Link**
- **"Lambda triggers"** - Click this directly

**Option B: Under Settings**
- **"User pool properties"** → Scroll down to find **"Lambda configuration"** section
- Look for **"Post confirmation"** trigger

**Option C: Under Extensions**
- **"Extensions"** → **"Lambda triggers"**

### Step 3: Configure Post-Confirmation

1. Find **"Post confirmation"** in the list of triggers
2. Click the dropdown/select next to it
3. Select: `predixa-post-confirmation`
4. Click **Save changes**

## Visual Guide

```
Cognito Console
│
├─ User pools (click here to go back)
│  │
│  └─ User pool - g5anv7 ← YOU NEED TO BE HERE
│     │
│     ├─ Overview
│     ├─ Applications
│     │  └─ App clients ← YOU ARE HERE (wrong level)
│     │
│     ├─ Lambda triggers ← GO HERE INSTEAD!
│     │  └─ Post confirmation → Select your Lambda
│     │
│     └─ User pool properties
│        └─ Lambda configuration (scroll down)
│           └─ Post confirmation
```

## Quick Way to Get There

1. **Click "User pools"** in the left sidebar (top of the list)
2. **Click on your User Pool name**: `g5anv7` or whatever it's called
3. **Look for "Lambda triggers"** in the left sidebar
4. If you don't see it, try **"User pool properties"** tab and scroll down

## Note About "Cognito Sync Trigger"

**"Cognito Sync Trigger"** in Lambda is different - that's for **Identity Pools** (for granting IAM credentials), not User Pool triggers.

You need **"Post confirmation"** trigger, which is configured from the User Pool level in Cognito.

---

**Try clicking on "User pools" in the left sidebar, then click your User Pool name, then look for "Lambda triggers"!**

