# Fix Google Sign-In Users Missing Names

## Problem
Users who signed in with Google can't see their `given_name` and `family_name` in the app.

## Solution

### Option 1: Sign Out and Back In (Recommended)

1. **Sign out** of your app completely
2. **Clear browser cache/cookies** for your domain
3. **Sign back in** with Google - this will refresh the authentication token and populate the attributes

This should work if the attribute mappings in Cognito are correct.

### Option 2: Check Browser Console

After adding the logging I just added:

1. Open browser console (F12)
2. Sign in with Google
3. Look for the console logs that say:
   ```
   checkAuth: All attributes fetched: {...}
   checkAuth: Given name: <value or undefined>
   checkAuth: Family name: <value or undefined>
   ```

### Option 3: Verify Cognito Attribute Mappings

In AWS Cognito Console:
1. Go to **Authentication** → **Social and external providers**
2. Click on **Identity provider: Google**
3. Click **Edit** in the "Attribute mapping" section
4. Verify you have these mappings:
   - `given_name` (User pool) ← `given_name` (Google)
   - `family_name` (User pool) ← `family_name` (Google)
   - `email` (User pool) ← `email` (Google)
   - `name` (User pool) ← `name` (Google) (optional)
   - `username` (User pool) ← `sub` (Google)

5. Click **Save**

### Option 4: Check Google OAuth Scopes

Make sure your Google OAuth client in Google Cloud Console has these scopes enabled:
- `profile` (includes name information)
- `email`
- `openid`

### Option 5: Manual Fix for Existing Users

If Google didn't populate the attributes and they remain empty, users can:

1. Go to Account page
2. Click **Edit** on their profile
3. Enter their first and last name
4. Click **Save**

This will manually populate the attributes going forward.

## Testing Steps

1. **Check current state**: Open Account page as a Google user - what name shows?
2. **Check console**: What attributes are fetched?
3. **Sign out and back in**: Does it populate now?
4. **Try editing**: Can they edit their name?

## Expected Console Output

For a Google user, you should see:
```json
{
  "sub": "google-oauth-123...",
  "email": "user@example.com",
  "email_verified": true,
  "given_name": "John",
  "family_name": "Doe",
  "name": "John Doe",
  "picture": "https://..."
}
```

If `given_name` and `family_name` are `undefined`, the mapping isn't working or Google didn't provide them.

## Common Issues

### Issue 1: Attributes are undefined
- **Cause**: Cognito didn't map them from Google
- **Fix**: Re-check the attribute mappings in Cognito

### Issue 2: User signed in before mappings were set up
- **Cause**: User account created without these attributes
- **Fix**: Have user edit their profile to manually set the names

### Issue 3: Google didn't provide these attributes
- **Cause**: User didn't grant profile scope permission
- **Fix**: Have them sign out, clear data, and sign back in, granting all permissions

## Quick Debug Command

Check what attributes a user has in the browser console:

```javascript
// Run this in browser console after sign in
const { fetchUserAttributes } = await import('aws-amplify/auth');
const attrs = await fetchUserAttributes();
console.log('User attributes:', attrs);
```

This will show you exactly what attributes Cognito has for the current user.




