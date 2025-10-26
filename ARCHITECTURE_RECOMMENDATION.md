# Recommended Authentication & User Profile Architecture

## Summary

**Industry Best Practice**: Use **Cognito for authentication** + **DynamoDB for user profiles**

This is the approach used by apps like Airbnb, Slack, and most modern SaaS applications.

---

## Why This Approach?

### ✅ **Problem: Cognito Limitations**

You've experienced this:
- Permission issues when users edit profiles
- Attributes can't be updated without app client write permissions
- Different behavior for email vs. Google vs. Apple sign-in
- Limited flexibility for custom fields

### ✅ **Solution: Hybrid Architecture**

**Cognito**: Handle authentication only
- Email/password
- Google Sign-In
- Apple Sign-In  
- Generate secure tokens
- Manage sessions

**DynamoDB**: Store user profiles
- User preferences
- Profile data (name, avatar, etc.)
- Subscription info
- Custom fields
- No permission issues
- Easy to query and update

---

## Architecture Diagram

```
User Sign-in
    ↓
Cognito (Authentication)
    ↓
Gets User ID
    ↓
DynamoDB (Profile Storage)
    ↓
Complete User Data
```

**Flow**:
1. User signs in via email/Google/Apple → **Cognito validates** and returns user ID
2. App fetches profile from **DynamoDB** using user ID
3. User edits profile → Updates **DynamoDB** directly (no Cognito involved)
4. App always reads from **DynamoDB** for profile data

---

## What NOT to Use

### ❌ **S3 as a Database**
- S3 is **object storage**, not a database
- Can't query user data efficiently
- No transactions or atomic updates
- Terrible choice for user profiles

### ❌ **Cognito Only**
- Limited to basic attributes
- Permission issues for users
- Hard to extend with custom fields
- Doesn't scale well for complex profiles

### ❌ **RDS PostgreSQL**
- Overkill for simple user profiles
- Requires connection pooling
- More setup and maintenance
- Good for relational data, but you don't need it here

---

## Implementation Files

I've created these files for you:

1. **`src/lib/user-profile-service.ts`**
   - Service to read/write profiles from DynamoDB
   - Handles all profile operations
   - No Cognito permission issues

2. **`DYNAMODB_SETUP.md`**
   - Step-by-step setup guide
   - IAM permissions
   - Terraform config

3. **`scripts/sync-profiles.ts`**
   - Migration script for existing users
   - Backfills Cognito users to DynamoDB

4. **`src/lib/auth-store.ts`** (updated)
   - Now uses DynamoDB for profile updates
   - Falls back to Cognito attributes if no profile exists

---

## Benefits

| Feature | Cognito Only | DynamoDB + Cognito ✅ |
|---------|-------------|----------------------|
| No permission issues | ❌ | ✅ |
| Easy to update profiles | ❌ | ✅ |
| Multiple auth providers | ✅ | ✅ |
| Custom fields | Limited | ✅ Any fields |
| Fast queries | ❌ | ✅ Millisecond latency |
| Cost | Free tier | ~$0.01/month per 10k users |
| Scalability | Limited | ✅ Millions of users |

---

## Cost

**Cognito**: Free for first 50,000 MAU  
**DynamoDB**: Pay-per-request (~$0.01/month per 10,000 active users)

**Total**: Essentially free for most apps

---

## Migration Path

1. **Create DynamoDB table** (5 minutes)
2. **Install dependencies** (`npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb`)
3. **Run sync script** to migrate existing users
4. **Update environment variables**
5. **Deploy** - new system works immediately

No downtime, no breaking changes!

---

## Next Steps

1. Follow `DYNAMODB_SETUP.md` to create the table
2. Update your code (already done)
3. Test locally
4. Deploy

Questions? Check the setup guide or run the sync script.



