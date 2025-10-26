# Cognito Attribute Setup Guide

## Enabling given_name and family_name Attributes

### Step 1: Configure Attributes in Cognito User Pool

1. **Go to AWS Cognito Console**
   - Navigate to: https://console.aws.amazon.com/cognito/
   - Select "User pools"
   - Click on your user pool (e.g., `g5anv7`)

2. **Configure Sign-in Experience**
   - Click on **"Sign-in experience"** in the left sidebar
   - Under **"Attributes"**, you should see the list of user attributes
   - Ensure these attributes are listed:
     - `email` (marked as required)
     - `given_name`
     - `family_name`
     - `name` (optional, but recommended for Google Sign-In)

3. **Check Attribute Properties**
   - All attributes must be **mutable** (not read-only) to allow users to update them
   - Standard attributes like `given_name` and `family_name` are mutable by default

### Step 2: Add Custom Attributes (If Not Present)

If `given_name` and `family_name` are not already configured:

1. Go to **"Attributes"** tab
2. Under **"Required attributes"**, ensure at minimum:
   - `email`
   - `given_name` (optional)
   - `family_name` (optional)

### Step 3: Verify User Pool Configuration

1. Go to **"User pool properties"**
2. Under **"User attributes"**, verify:
   - Attributes are set as **Mutable**
   - No read-only settings are blocking updates

### Step 4: Check App Client Settings

1. Go to **"App integration"** in the left sidebar
2. Under **"App clients"**, click on your app client
3. Ensure:
   - **Read attributes**: Includes `email`, `given_name`, `family_name`
   - **Write attributes**: Includes `given_name`, `family_name` (CRITICAL for allowing updates)

### Step 5: Test the Configuration

After making changes:

1. **Sign out and sign back in** to your app
2. Try editing the name in the account page
3. Check the browser console for any errors
4. If you see errors, they will tell you exactly what permissions are missing

## Common Issues

### Issue 1: "Attributes do not require verification"
- **Solution**: `given_name` and `family_name` don't require email/phone verification, so this shouldn't be an issue

### Issue 2: "User pool attribute is read-only"
- **Solution**: Go to User Pool → Attributes → Check if marked as read-only. Standard attributes should be mutable by default.

### Issue 3: "User pool client does not have permission to update attribute"
- **Solution**: Go to App Client settings → Ensure "Write attributes" includes `given_name` and `family_name`

### Issue 4: Attributes exist but are empty
- **Solution**: If attributes weren't set during sign-up, they'll be empty. Users can now set them via the edit form.

## Verification Checklist

- [ ] `given_name` is in User Pool attributes
- [ ] `family_name` is in User Pool attributes
- [ ] Both are set as mutable (not read-only)
- [ ] App client has read permissions for these attributes
- [ ] App client has write permissions for these attributes (CRITICAL)
- [ ] User has signed out and back in after any permission changes

## Alternative: Using Cognito CLI

If you prefer CLI:

```bash
# Check current app client settings
aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID

# Update app client to allow write attributes
aws cognito-idp update-user-pool-client \
  --user-pool-id YOUR_POOL_ID \
  --client-id YOUR_CLIENT_ID \
  --write-attributes email,given_name,family_name \
  --read-attributes email,given_name,family_name,name
```




