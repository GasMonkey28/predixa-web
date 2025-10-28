# 🔴 CRITICAL: Authentication Fix Required

## Issues Found:

1. **Missing Identity Pool ID** - Required for DynamoDB access
2. **Redirect Port Mismatch** - OAuth redirects to wrong port
3. **Token Scopes Error** - Access Token doesn't have required scopes

## Quick Fix Steps:

### 1. Add Identity Pool ID to .env.local

Open your `.env.local` file and add:

```bash
NEXT_PUBLIC_IDENTITY_POOL_ID=us-east-1:204b03b2-f315-413d-8e5f-1b430513feb2
```

### 2. Clear Browser Cache & Auth State

The error shows your current session has insufficient scopes. You need to:

1. Open browser DevTools (F12)
2. Go to Application tab → Clear Storage → Clear All
3. Or go to the Console and run:
```javascript
localStorage.clear()
sessionStorage.clear()
```

### 3. Restart Dev Server

After adding the environment variable:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 4. Add localhost:3001 to AWS Cognito

You need to add `http://localhost:3001` to your Cognito App Client allowed callback URLs:

1. Go to AWS Console → Cognito
2. Select your User Pool
3. Go to App Integration tab
4. Select your App Client
5. In "Allowed callback URLs" add: `http://localhost:3001`
6. In "Allowed sign-out URLs" add: `http://localhost:3001`
7. Save

## OR Use Port 3000 Instead

Stop whatever is running on port 3000:

```powershell
# Find and kill the process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

Then your app will run on `localhost:3000` as expected.

## After Fixing:

1. Clear browser storage (localStorage & sessionStorage)
2. Refresh the page
3. Try signing in again

