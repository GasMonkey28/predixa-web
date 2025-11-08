# Duplicate Email Prevention - Quick Answers

## Your Questions Answered

### 1. Do I need to delete duplicate emails across 3 databases?

**Short Answer: No, you can leave them** ✅

**Why**:
- ✅ The Pre-Signup Lambda will **prevent new duplicates** going forward
- ✅ Existing duplicates won't cause major issues
- ✅ Users can continue using their existing accounts
- ✅ No data loss or disruption

**When you might want to clean them up**:
- If users complain about confusion
- Before a major marketing campaign
- When you have time to review each duplicate manually

**How to find duplicates** (without deleting):
```bash
cd backend/auth_billing
python find_duplicate_users.py
```

This shows you all duplicates so you can review them.

---

### 2. If I delete one user from one database, does it delete across all 3?

**Short Answer: No, currently it does NOT cascade** ❌

**Current Behavior**:
- Delete from Cognito → User can't sign in, but data remains in DynamoDB/Stripe
- Delete from DynamoDB → User can sign in, but profile is gone
- Delete from Stripe → User can sign in, but subscription data is gone

**Do you need cascading deletes?**

**Usually: No** ✅

**Why**:
- Most apps use **soft deletes** (mark as deleted, don't actually delete)
- Hard deletes are risky (can't recover data)
- GDPR/legal requirements may require keeping some data
- Users rarely need to be deleted

**When you might need it**:
- User requests account deletion (GDPR right to be forgotten)
- Compliance requirements
- Cleanup of test accounts

**If you need to delete a user from all systems**:

I've created a script for you:

```bash
cd backend/auth_billing
python delete_user.py user@example.com --confirm
```

This will delete the user from:
- ✅ Cognito
- ✅ DynamoDB (UserProfiles + Entitlements)
- ✅ Stripe (if customer exists)

**⚠️ Warning**: This is a HARD DELETE - use with caution!

---

## Recommended Approach

### For Existing Duplicates

**Option 1: Leave them (Recommended)** ✅
- Pre-Signup Lambda prevents new duplicates
- Existing users can continue using their accounts
- No disruption or data loss

**Option 2: Review and clean up manually**
```bash
# Find duplicates
python find_duplicate_users.py

# Review the output
# Then manually decide which accounts to keep/delete
```

**Option 3: Automated cleanup (Use with caution)**
```bash
# Dry run first (shows what would be deleted)
python find_duplicate_users.py --dry-run

# Actually delete (keeps oldest account)
python find_duplicate_users.py --delete
```

### For User Deletion

**Option 1: Don't implement automatic deletion (Recommended)** ✅
- Most SaaS apps don't auto-delete users
- Let users keep their accounts
- Only delete if explicitly requested

**Option 2: Use the delete script when needed**
- For GDPR requests
- For test account cleanup
- For specific user requests

**Option 3: Implement soft deletes (Future enhancement)**
- Add `deletedAt` field to UserProfiles
- Mark users as deleted instead of actually deleting
- Filter out deleted users in queries
- Keep data for compliance/analytics

---

## Quick Start

### 1. Prevent Future Duplicates

Follow the guide: `backend/auth_billing/DUPLICATE_EMAIL_PREVENTION.md`

**Steps**:
1. Create EmailIndex GSI on UserProfiles
2. Deploy Pre-Signup Lambda
3. Test duplicate prevention

### 2. Handle Existing Duplicates

**Recommended**: Leave them for now ✅

If you want to review them:
```bash
cd backend/auth_billing
python find_duplicate_users.py
```

### 3. User Deletion

**Recommended**: Don't implement automatic deletion ✅

If you need to delete a specific user:
```bash
cd backend/auth_billing
python delete_user.py user@example.com --confirm
```

---

## Summary

| Question | Answer |
|----------|--------|
| **Delete existing duplicates?** | No, you can leave them. Pre-Signup Lambda prevents new ones. |
| **Cascading deletes?** | No, currently doesn't cascade. Script provided if needed. |
| **Need to implement deletion?** | Usually no. Most apps don't auto-delete users. |
| **What to do now?** | 1. Create EmailIndex GSI<br>2. Deploy Pre-Signup Lambda<br>3. Test duplicate prevention<br>4. (Optional) Review existing duplicates |

---

## Files Created

1. **`pre_signup_lambda.py`** - Prevents duplicate signups
2. **`find_duplicate_users.py`** - Finds existing duplicates
3. **`delete_user.py`** - Deletes user from all systems
4. **`DUPLICATE_EMAIL_PREVENTION.md`** - Complete setup guide

All files are in: `backend/auth_billing/`

