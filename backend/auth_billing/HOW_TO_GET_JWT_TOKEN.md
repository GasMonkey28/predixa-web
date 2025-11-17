# How to Get JWT Token for Testing

## What is a JWT Token?

**JWT** = JSON Web Token

It's a token that Cognito gives you when you sign in. It contains:
- Your user identity (cognito_sub)
- Email
- Expiration time
- Other user info

The API Gateway uses this token to verify who you are.

---

## Where to Get JWT Token

### Option 1: From iOS App (Recommended)

When a user signs in with Cognito in your iOS app, you get tokens back. The JWT token is usually called:

- **`idToken`** - This is what you need!
- Or **`accessToken`** - Sometimes this works too

**In Swift code, it's usually:**
```swift
// After signing in with AWS Amplify or Cognito SDK
let result = try await Amplify.Auth.signIn(...)
let idToken = result.idToken  // This is your JWT!
```

**To get it for testing:**
1. Add temporary logging in your iOS app:
   ```swift
   // After sign in
   if let idToken = try await Amplify.Auth.fetchAuthSession().userPoolTokens()?.idToken {
       print("JWT Token: \(idToken)")
       // Copy this from console/logs
   }
   ```

2. Or add a debug button that shows the token:
   ```swift
   // Debug function
   func getCurrentToken() async {
       do {
           let session = try await Amplify.Auth.fetchAuthSession()
           if let tokens = session.userPoolTokens() {
               print("ID Token: \(tokens.idToken)")
               // Display in UI or copy to clipboard
           }
       } catch {
           print("Error: \(error)")
       }
   }
   ```

---

### Option 2: From Web App (If you have one)

**If using AWS Amplify:**
```javascript
import { Auth } from 'aws-amplify';

// After sign in
const session = await Auth.currentSession();
const idToken = session.getIdToken().getJwtToken();
console.log('JWT Token:', idToken);
```

**If using Cognito directly:**
```javascript
// After authentication
const idToken = authenticationResult.idToken;
console.log('JWT Token:', idToken);
```

**In browser console:**
- Open Developer Tools (F12)
- Go to Console tab
- Run the code above
- Copy the token

---

### Option 3: From Browser (If web app stores it)

**Check localStorage:**
1. Open browser Developer Tools (F12)
2. Go to Application/Storage tab
3. Look for:
   - `CognitoIdentityServiceProvider.*.idToken`
   - Or `amplify-auth-token`
   - Or similar Cognito-related keys
4. Copy the token value

---

### Option 4: Using AWS CLI (If you have user password)

**Only works if user has password (not Google sign-in):**

```powershell
# This won't work for Google sign-in users
aws cognito-idp initiate-auth `
    --auth-flow USER_PASSWORD_AUTH `
    --client-id YOUR_CLIENT_ID `
    --auth-parameters USERNAME=kerendeyouxiang02@gmail.com,PASSWORD=password `
    --region us-east-1
```

**Note:** Your test user is Google sign-in, so this won't work. You need to get token from the app.

---

## What the Token Looks Like

A JWT token looks like this (very long string):

```
eyJraWQiOiJcL0V2a1wvS2J...very long string...xyz123
```

It has 3 parts separated by dots:
- `header.payload.signature`

You can decode it at https://jwt.io to see what's inside (but don't share tokens publicly!)

---

## Quick Test: Add Debug Endpoint

**Easiest way for testing:** Add a temporary debug endpoint in your app that shows the token:

**iOS (Swift):**
```swift
// Add this to a debug/settings screen
Button("Show My Token") {
    Task {
        do {
            let session = try await Amplify.Auth.fetchAuthSession()
            if let tokens = session.userPoolTokens() {
                print("Token: \(tokens.idToken)")
                // Show in alert or copy to clipboard
            }
        } catch {
            print("Error: \(error)")
        }
    }
}
```

**Web (React/Next.js):**
```javascript
// Debug component
function ShowToken() {
    const [token, setToken] = useState('');
    
    useEffect(async () => {
        const session = await Auth.currentSession();
        setToken(session.getIdToken().getJwtToken());
    }, []);
    
    return (
        <div>
            <p>Token: {token}</p>
            <button onClick={() => navigator.clipboard.writeText(token)}>
                Copy Token
            </button>
        </div>
    );
}
```

---

## Using the Token

Once you have the token:

```powershell
# Replace YOUR_TOKEN with the actual token
$TOKEN = "eyJraWQiOiJcL0V2a1wvS2J..."
curl -X DELETE https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account -H "Authorization: Bearer $TOKEN"
```

---

## Token Expiration

⚠️ **JWT tokens expire after 1 hour**

If you get a 401 error, the token expired. Get a fresh one by:
- Signing out and signing back in
- Or refreshing the session in your app

---

## Summary

**For your test user (Google sign-in):**
1. Sign in with `kerendeyouxiang02@gmail.com` in your iOS app
2. Get the `idToken` from the auth response
3. Use that token in the DELETE request

**Easiest way:** Add temporary debug logging in your iOS app to print/show the token.

---

**Need help adding debug code to your iOS app?** I can help with that! 🚀


