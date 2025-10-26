# 🔍 Google Login Debugging

## What I Fixed

I added fallback logic for Google/Apple sign-in users who might have their name in the `name` attribute instead of `given_name` and `family_name`.

---

## Test Google Login

### Step 1: Check Console

Open browser console (F12) and look for:
- "checkAuth: Starting auth check..."
- "checkAuth: All attributes fetched:"
- Any error messages

### Step 2: Sign In with Google

1. Click "Continue with Google"
2. Complete Google sign-in
3. Watch console for errors

---

## Common Issues

### Issue 1: OAuth Redirect Error
**Error**: "redirect_uri_mismatch" or similar

**Fix**: Make sure redirect URLs match in Cognito:
- Go to Cognito Console
- Check OAuth callback URLs

### Issue 2: Missing Attributes
**Error**: User signed in but no name shown

**Fix**: Google users might have name in `name` attribute - I added fallback logic to handle this

### Issue 3: Token Refresh Issue
**Error**: "Token expired" or "Invalid token"

**Fix**: 
1. Clear browser cache
2. Sign out completely
3. Try again

---

## What Changed

I updated `checkAuth` to handle Google users properly:

```typescript
// If given_name/family_name don't exist, try to use 'name' attribute
if (!givenName && !familyName && attributes.name) {
  const nameParts = attributes.name.split(' ')
  givenName = nameParts[0]
  familyName = nameParts.slice(1).join(' ')
}
```

This means Google sign-in should work now!

---

## Test It

```bash
npm run dev
```

1. Go to login page
2. Click "Continue with Google"  
3. Complete Google sign-in
4. Should redirect to app successfully

---

## If It Still Doesn't Work

Share the console error and I'll fix it!

