# What Happens When You Test Delete Function

## ⚠️ IMPORTANT: This Will DELETE the User Account!

When you call the DELETE endpoint, here's exactly what happens:

---

## Step-by-Step: What Gets Deleted

### 1. API Gateway Receives Request
- Validates JWT token (Cognito Authorizer)
- Extracts `cognito_sub` from token
- Forwards to Lambda function

### 2. Lambda Function Executes

**For your test user (`google_100578348725685118649`):**

#### Step 1: Get User Info from DynamoDB
- Looks up user in `UserProfiles` table
- Gets `stripeCustomerId` if exists
- Gets email for logging

#### Step 2: Delete from DynamoDB UserProfiles
- Deletes record with `userId = google_100578348725685118649`
- ✅ **User data removed from UserProfiles table**

#### Step 3: Delete from DynamoDB predixa_entitlements
- Deletes record with `cognito_sub = google_100578348725685118649`
- ✅ **Subscription/entitlement data removed**

#### Step 4: Delete from Stripe (if customer exists)
- If user has `stripeCustomerId`, deletes Stripe customer
- ✅ **Stripe customer record deleted**
- ⚠️ **Note**: If stripe module not available, this step is skipped

#### Step 5: Delete from Cognito
- Deletes user from Cognito User Pool
- ✅ **User can no longer sign in**
- ✅ **User account permanently removed from Cognito**

---

## What You'll See

### In CloudWatch Logs:
```
📥 Delete user request: ...
🗑️ Deleting user account: google_100578348725685118649
   User email: kerendeyouxiang02@gmail.com
   Stripe customer ID: None (or actual ID if exists)
✅ Deleted from DynamoDB UserProfiles: google_100578348725685118649
✅ Deleted from DynamoDB Entitlements: google_100578348725685118649
⚠️ Stripe module not available, skipping Stripe deletion
✅ Deleted from Cognito: google_100578348725685118649
------------------------------------------------------------
Deletion Summary:
  - DynamoDB UserProfiles: ✅
  - DynamoDB Entitlements: ✅
  - Stripe: ✅ (or ⚠️ if skipped)
  - Cognito: ✅
------------------------------------------------------------
✅ Successfully deleted user account: google_100578348725685118649
```

### API Response (200 OK):
```json
{
  "success": true,
  "message": "User account deleted successfully",
  "deleted": {
    "cognito": true,
    "dynamodb_userprofiles": true,
    "dynamodb_entitlements": true,
    "stripe": true
  }
}
```

---

## After Deletion - Verification

### ✅ User Cannot Sign In
- Trying to sign in with `kerendeyouxiang02@gmail.com` will fail
- Cognito will say user doesn't exist

### ✅ Data Removed from DynamoDB
- UserProfiles: User record gone
- predixa_entitlements: Entitlement record gone

### ✅ Stripe Customer Deleted (if existed)
- Customer removed from Stripe
- No more billing/subscription data

---

## ⚠️ Important Notes

### This is PERMANENT
- User account is permanently deleted
- Cannot be undone (unless you restore from backup)
- User will need to create a new account to use the app again

### Backups Available
- ✅ DynamoDB backups in `backups/` folder
- ✅ Cognito backup in `backups/CognitoUsers_backup.json`
- ✅ DynamoDB PITR enabled (can restore to any point in last 35 days)

### If Something Goes Wrong
- Check CloudWatch Logs for errors
- Partial failures are logged (some systems may not delete)
- You can restore from backups if needed

---

## Safe Testing Checklist

Before testing:
- [x] ✅ Backups created (DynamoDB, Cognito, Stripe)
- [x] ✅ Using test user account (not real user)
- [x] ✅ PITR enabled for DynamoDB (can restore)
- [ ] ⚠️ Ready to permanently delete test user

---

## How to Test

### 1. Get JWT Token
- Sign in as test user in iOS app
- Get `idToken` from auth response

### 2. Make DELETE Request
```powershell
curl -X DELETE https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Check Response
- Should get 200 OK with success message
- Check CloudWatch Logs for details

### 4. Verify Deletion
- Try to sign in with test user → Should fail
- Check DynamoDB → User should be gone
- Check Cognito → User should be deleted

---

## What If You Need to Restore?

### From Backups:
1. **DynamoDB**: Use PITR to restore table to point before deletion
2. **Cognito**: Recreate user manually (can't fully restore, but can recreate)
3. **Stripe**: Check if customer still exists (may be soft-deleted)

---

## Summary

**When you test, this user will be PERMANENTLY DELETED:**
- Email: `kerendeyouxiang02@gmail.com`
- Cognito Sub: `google_100578348725685118649`

**What gets deleted:**
- ✅ Cognito user account
- ✅ DynamoDB UserProfiles record
- ✅ DynamoDB predixa_entitlements record
- ✅ Stripe customer (if exists)

**After deletion:**
- User cannot sign in
- All user data removed
- User must create new account to use app again

**You're safe because:**
- ✅ Backups are ready
- ✅ PITR enabled (can restore DynamoDB)
- ✅ It's a test user account

---

**Ready to test?** Make sure you have the JWT token and backups are ready! 🚀


