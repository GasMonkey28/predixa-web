# ✅ Fixed: Google/Apple Sign-In Port Issue

## What I Fixed

Changed OAuth redirect URLs to only use port **3000** (removed 3001).

---

## Try Now

### Step 1: Go to Correct Port

Make sure you're accessing: **`http://localhost:3000`** (not 3001)

### Step 2: Clear Browser Cache

**Option A: Hard Refresh**
- Press **Ctrl+Shift+R** (or Cmd+Shift+R on Mac)
- This clears the cached OAuth redirect URL

**Option B: Private Window**
- Open a **new incognito/private window**
- Go to `http://localhost:3000`
- Try sign-in

### Step 3: Try Google Sign-In

1. Go to `http://localhost:3000`
2. Click **"Sign In"**
3. Click **"Continue with Google"**
4. Complete Google authentication
5. Should redirect back to port 3000 ✅

---

## Why This Happened

Your Amplify config had **both** ports in redirect URLs:
- ❌ `http://localhost:3001` (no server running)
- ✅ `http://localhost:3000` (server running)

Amplify was picking the wrong port. Now it only uses port 3000.

---

## If Still Not Working

Make sure you're on port **3000**:

Check the terminal - should show:
```
▲ Next.js 14.2.33
- Local: http://localhost:3000
```

If you see a different port, stop the server and restart.

---

## Done! 🎉

Just use **Ctrl+Shift+R** to refresh and try Google sign-in again!

