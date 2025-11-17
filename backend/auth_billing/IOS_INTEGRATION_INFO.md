# iOS Integration Information for Account Deletion

## 1. API Gateway Information

### Endpoint URL
```
https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account
```

### API Path
```
/me/account
```

### HTTP Method
```
DELETE
```

### Region
```
us-east-1
```

### Full Endpoint
```
DELETE https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account
```

---

## 2. Authentication Details

### ✅ Using Cognito User Pool Authorizer
- **Yes**, API Gateway uses **Cognito User Pool Authorizer**
- User Pool ID: `us-east-1_iYC6qs6H2`

### ✅ JWT Token Required
- **Yes**, you MUST send the JWT token in the Authorization header
- Header format: `Authorization: Bearer <JWT_TOKEN>`
- Token type: Cognito `idToken` (from sign-in response)

### Authentication Method
- **Cognito User Pool Authorizer** (not API Keys, not IAM)
- Token is validated automatically by API Gateway before Lambda runs

---

## 3. Request/Response Format

### Request Body
**None required** - DELETE request has no body
- The Lambda extracts user identity from the JWT token
- No parameters needed

### Request Headers
```
Authorization: Bearer <COGNITO_ID_TOKEN>
Content-Type: application/json (optional)
```

### Success Response (200 OK)
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

### Unauthorized Response (401)
```json
{
  "error": "Unauthorized - missing user identity"
}
```

### Error Response (500)
```json
{
  "success": false,
  "error": "Failed to delete user account",
  "details": {
    "cognito": false,
    "dynamodb_userprofiles": true,
    "dynamodb_entitlements": true,
    "stripe": true
  }
}
```

### Status Codes to Handle
- **200** - Success (account deleted)
- **401** - Unauthorized (invalid/missing token)
- **403** - Forbidden (security error - shouldn't happen)
- **500** - Server error (partial failure)

---

## 4. iOS Implementation Example

### Swift Code (Using URLSession)

```swift
import Foundation

func deleteAccount() async throws {
    // 1. Get Cognito ID Token
    let session = try await Amplify.Auth.fetchAuthSession()
    guard let tokens = session.userPoolTokens(),
          let idToken = tokens.idToken else {
        throw AuthError.notAuthenticated
    }
    
    // 2. Prepare request
    let url = URL(string: "https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account")!
    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"
    request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    // 3. Make request
    let (data, response) = try await URLSession.shared.data(for: request)
    
    // 4. Check response
    guard let httpResponse = response as? HTTPURLResponse else {
        throw APIError.invalidResponse
    }
    
    // 5. Handle response
    switch httpResponse.statusCode {
    case 200:
        // Success - parse response
        let result = try JSONDecoder().decode(DeleteAccountResponse.self, from: data)
        print("Account deleted: \(result)")
        
        // Clear local data
        clearLocalUserData()
        
        // Sign out from Cognito
        try await Amplify.Auth.signOut()
        
    case 401:
        throw APIError.unauthorized
        
    case 500:
        let error = try JSONDecoder().decode(DeleteAccountError.self, from: data)
        throw APIError.serverError(error)
        
    default:
        throw APIError.unknown(httpResponse.statusCode)
    }
}

// Response models
struct DeleteAccountResponse: Codable {
    let success: Bool
    let message: String
    let deleted: DeletionDetails
}

struct DeletionDetails: Codable {
    let cognito: Bool
    let dynamodb_userprofiles: Bool
    let dynamodb_entitlements: Bool
    let stripe: Bool
}

struct DeleteAccountError: Codable {
    let success: Bool
    let error: String
    let details: DeletionDetails?
}

enum APIError: Error {
    case unauthorized
    case serverError(DeleteAccountError)
    case invalidResponse
    case unknown(Int)
}
```

### Swift Code (Using Amplify API - if configured)

```swift
// If you have Amplify API configured
func deleteAccount() async throws {
    // Get token
    let session = try await Amplify.Auth.fetchAuthSession()
    guard let tokens = session.userPoolTokens(),
          let idToken = tokens.idToken else {
        throw AuthError.notAuthenticated
    }
    
    // Use Amplify API
    let request = RESTRequest(
        path: "/me/account",
        method: .delete,
        headers: [
            "Authorization": "Bearer \(idToken)"
        ]
    )
    
    let response = try await Amplify.API.delete(request: request)
    // Handle response...
}
```

---

## 5. Important Notes

### Security
- ✅ User can only delete their own account (JWT token contains their identity)
- ✅ No way to specify different user ID
- ✅ API Gateway validates JWT before Lambda runs

### After Successful Deletion
1. **Clear local app data** (user preferences, cached data, etc.)
2. **Sign out from Cognito** (`Amplify.Auth.signOut()`)
3. **Navigate to login screen**
4. **Show success message** to user

### Error Handling
- **401**: Token expired or invalid - prompt user to sign in again
- **500**: Partial failure - some systems may not have deleted
  - Check `details` object to see what succeeded/failed
  - Log for debugging
  - Show appropriate message to user

### Token Expiration
- JWT tokens expire after 1 hour
- If you get 401, refresh the session or have user sign in again

---

## 6. Testing

### Test Endpoint
```
DELETE https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account
```

### Test with curl
```bash
curl -X DELETE \
  https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account \
  -H "Authorization: Bearer YOUR_COGNITO_ID_TOKEN" \
  -v
```

---

## 7. Summary

| Item | Value |
|------|-------|
| **Endpoint** | `https://g0ut3e1ll1.execute-api.us-east-1.amazonaws.com/prod/me/account` |
| **Method** | `DELETE` |
| **Auth** | Cognito User Pool Authorizer |
| **Header** | `Authorization: Bearer <ID_TOKEN>` |
| **Body** | None |
| **Success** | 200 with JSON response |
| **Error** | 401 (unauthorized) or 500 (server error) |

---

**Ready to implement!** All the information you need is here. 🚀


