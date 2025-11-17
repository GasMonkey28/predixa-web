# Delete User Function - Security & Usage

## 🔒 Security Review

### ✅ Security Measures in Place

1. **JWT Token Validation**
   - API Gateway Cognito Authorizer validates JWT token **before** Lambda is invoked
   - Only authenticated users with valid tokens can call the function
   - Token must be from the configured Cognito User Pool

2. **User Identity Extraction**
   - `cognito_sub` is extracted **only** from the validated JWT token
   - Comes from `event.requestContext.authorizer.claims.sub`
   - This is set by API Gateway after validating the token - **cannot be manipulated by users**

3. **Additional Validation**
   - If user exists in DynamoDB, we verify `userId` matches `cognito_sub` from JWT
   - Prevents any potential data corruption issues
   - Returns 403 Forbidden if mismatch detected

4. **No User Input Parameters**
   - Function does NOT accept any path parameters, query parameters, or body parameters
   - All user identity comes from the validated JWT token
   - Users **cannot** specify which account to delete

5. **Direct Deletion**
   - Uses `cognito_sub` directly for all deletions:
     - DynamoDB UserProfiles: `Key={"userId": cognito_sub}`
     - DynamoDB Entitlements: `Key={"cognito_sub": cognito_sub}`
     - Cognito: `Username=cognito_sub`
   - No lookups or transformations that could be manipulated

### ✅ How It Works

```
User calls DELETE /me/account with JWT token
    ↓
API Gateway Cognito Authorizer validates JWT
    ↓
If valid, extracts cognito_sub from JWT claims
    ↓
Lambda receives event with cognito_sub in requestContext.authorizer.claims
    ↓
Lambda extracts cognito_sub (from validated JWT, not user input)
    ↓
Lambda deletes user with that cognito_sub from all systems
```

**Result**: User can **ONLY** delete their own account because:
- The JWT token contains their own `cognito_sub`
- They cannot modify the JWT token (it's cryptographically signed)
- API Gateway validates it before Lambda sees it
- Lambda uses that validated `cognito_sub` directly

---

## 📞 How This Function Gets Called

### ✅ Only Via API Gateway

This Lambda function **ONLY** gets called through:
- **API Gateway endpoint**: `DELETE /me/account`
- **With Cognito Authorizer**: Validates JWT token
- **From your iOS app**: Makes HTTP DELETE request with JWT token in Authorization header

**It does NOT get called by:**
- ❌ Direct Lambda invocation
- ❌ Other AWS services
- ❌ Cognito triggers (see below)
- ❌ Manual AWS Console actions

---

## ❓ What Happens If You Manually Delete a User from Cognito?

### Answer: **Nothing Automatically**

If you manually delete a user from the AWS Cognito Console:
- ✅ User is deleted from Cognito
- ❌ User is **NOT** automatically deleted from DynamoDB
- ❌ User is **NOT** automatically deleted from Stripe
- ❌ This Lambda function is **NOT** triggered

**Why?**
- This Lambda is connected to **API Gateway**, not Cognito triggers
- Cognito does not automatically trigger this function when you delete a user manually
- The function only runs when called via the API Gateway endpoint

### If You Want Automatic Cleanup on Cognito Deletion

If you want DynamoDB/Stripe to be cleaned up when a user is deleted from Cognito (manually or programmatically), you would need to:

1. **Create a Cognito Pre-Delete Trigger Lambda**
   - Similar to `post_confirmation_lambda.py` but for deletion
   - Triggered by Cognito when a user is deleted
   - Would delete from DynamoDB and Stripe

2. **Configure it in Cognito**
   - Go to Cognito User Pool → Triggers
   - Set "Pre delete" trigger to your Lambda function

**Note**: This is a **separate** Lambda function from `delete_user_lambda.py`
- `delete_user_lambda.py` = User-initiated deletion via API (for iOS app)
- Pre-Delete Trigger Lambda = Automatic cleanup when Cognito deletes a user

---

## 🔍 Code Review Summary

### Security Checks in Code

```python
# 1. Extract cognito_sub from validated JWT (not user input)
cognito_sub = extract_cognito_sub_from_event(event)
# This comes from: event.requestContext.authorizer.claims.sub
# Set by API Gateway after validating JWT - cannot be faked

# 2. Verify no user ID mismatch (defense in depth)
if user_id and user_id != cognito_sub:
    return 403 Forbidden  # Security error

# 3. Use cognito_sub directly for all deletions
users_table.delete_item(Key={"userId": cognito_sub})
entitlements_table.delete_item(Key={"cognito_sub": cognito_sub})
cognito.admin_delete_user(Username=cognito_sub)
```

### Potential Attack Vectors - All Mitigated

| Attack | Mitigation |
|--------|------------|
| User tries to delete another user's account | ❌ Impossible - JWT token only contains their own `cognito_sub` |
| User modifies JWT token | ❌ Impossible - API Gateway validates signature before Lambda runs |
| User passes different user ID in request | ❌ Impossible - Function doesn't accept any user input parameters |
| User manipulates event object | ❌ Impossible - Event comes from API Gateway, not user |
| Data corruption in DynamoDB | ✅ Detected - We verify userId matches cognito_sub |

---

## ✅ Conclusion

**The function is secure:**
- Users can only delete their own account
- No way to specify a different user ID
- All identity comes from validated JWT token
- Additional validation checks prevent data corruption issues

**The function only runs:**
- When called via API Gateway endpoint `DELETE /me/account`
- With a valid Cognito JWT token
- From your iOS app or any HTTP client with valid token

**Manual Cognito deletion:**
- Does NOT trigger this function
- Does NOT automatically clean up DynamoDB/Stripe
- Would require a separate Cognito Pre-Delete trigger if you want automatic cleanup

---

## 📝 Recommendations

1. **For User-Initiated Deletion** (iOS app): ✅ Use `delete_user_lambda.py` via API Gateway
2. **For Admin/Manual Deletion**: Use the CLI script `delete_user.py` or create a separate admin endpoint
3. **For Automatic Cleanup**: Create a Cognito Pre-Delete trigger Lambda (separate function)


