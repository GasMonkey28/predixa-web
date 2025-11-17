# Test User Information

## Test User Details

**Email:** `kerendeyouxiang02@gmail.com`
**Cognito Sub (Username):** `google_100578348725685118649`
**Status:** `EXTERNAL_PROVIDER` (Google sign-in)
**User Pool:** `us-east-1_iYC6qs6H2`

---

## To Test Delete Function

### Step 1: Get JWT Token

You need to sign in as this user and get the JWT token. Options:

**Option A: From iOS App**
1. Sign in with `kerendeyouxiang02@gmail.com` in your iOS app
2. Get the JWT token from the authentication response
3. Copy the token

**Option B: From Web App**
1. Sign in with this email in your web app
2. Get the JWT token from localStorage or auth response
3. Copy the token

### Step 2: Make DELETE Request

```powershell
# Replace YOUR_JWT_TOKEN with actual token
$TOKEN = "YOUR_JWT_TOKEN"
$URL = "https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account"

curl -X DELETE $URL -H "Authorization: Bearer $TOKEN" -v
```

### Step 3: Verify Deletion

After successful deletion, verify:

```powershell
# Check Cognito (should fail - user deleted)
aws cognito-idp admin-get-user --user-pool-id us-east-1_iYC6qs6H2 --username google_100578348725685118649 --region us-east-1

# Should return: UserNotFoundException
```

---

## Expected Behavior

When you call DELETE with this user's JWT token:

1. ✅ Lambda extracts `cognito_sub` from JWT: `google_100578348725685118649`
2. ✅ Deletes from DynamoDB UserProfiles (if exists)
3. ✅ Deletes from DynamoDB predixa_entitlements (if exists)
4. ✅ Deletes from Stripe (if customer exists)
5. ✅ Deletes from Cognito

---

## Important Notes

⚠️ **This will permanently delete the test user!**

✅ **Backups are ready** in `backups/` folder if you need to restore

✅ **DynamoDB PITR enabled** - can restore to any point in last 35 days

---

## After Testing

Check CloudWatch Logs:
- Go to Lambda Console → `predixa-delete-user-api` → Monitor tab
- Click "View logs in CloudWatch"
- Look for deletion confirmation logs

---

**Ready to test!** Get the JWT token and make the DELETE request. 🚀


