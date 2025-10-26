# Fix Profile Edit Feature - Step by Step

## The Problem
When trying to edit your name in the account page, you get "Failed to update profile" error.

## The Solution
Your Cognito App Client needs permission to update `given_name` and `family_name` attributes.

---

## Step-by-Step Fix

### Step 1: Open Your Cognito User Pool

1. Go to AWS Console: https://console.aws.amazon.com/cognito/
2. Click on **User pools**
3. Click on your user pool (`g5anv7`)

### Step 2: Navigate to App Clients

In the left sidebar (newest AWS console layout):
1. Click **Applications** to expand it
2. Click **App clients** (under Applications)
3. You should see your app client listed (typically the one you created)
4. Click on the **app client name** (or the link/arrow to view details)

### Step 3: Configure Attribute Permissions (NEWEST AWS CONSOLE)

Once you click on your app client, look for one of these sections (they may appear in different orders):

#### Method 1: Look for "Attribute read and write permissions" 
This section shows checkboxes for which attributes can be read and written.

#### Method 2: Look for separate "Read" and "Write" sections
Some versions show them separately.

#### What You Need to Enable:

**Read attributes** (users can view these):
- ☑ `email`
- ☑ `given_name` 
- ☑ `family_name`
- ☑ `name` (optional, for Google Sign-In)

**Write attributes** (THIS IS CRITICAL - users can edit these):
- ☑ `email`
- ☑ `given_name` ← **Enable this!**
- ☑ `family_name` ← **Enable this!**

### Step 4: Enable Write Permissions & Save

In the **Write attributes** section:
1. Check the boxes for `given_name` and `family_name`
2. If you don't see them listed, they may be under "Custom attributes" or you may need to click "Add attribute"  
3. Scroll down and click **Save changes**
4. You may see a warning about breaking changes - this is normal for OAuth apps, click "Confirm"

### Step 5: Test in Your App

1. Sign out of your app
2. Sign back in (this refreshes the token with new permissions)
3. Go to Account page
4. Click Edit on your name
5. Make changes and click Save

---

## What to Look For

### ✅ Correct Configuration:
```
Writable Attributes:
☑ email
☑ given_name
☑ family_name
```

### ❌ Incorrect Configuration:
```
Writable Attributes:
☑ email
☐ given_name    <-- Missing!
☐ family_name   <-- Missing!
```

---

## If You Can't Find the Setting

If you don't see the writable attributes section:

1. Go back to **App integration**
2. Click **Edit** in the "App clients" section
3. Look for **"Allowed attributes"** or **"Attribute permissions"**
4. Ensure `given_name` and `family_name` are selected for writing

---

## Alternative: Using Terraform/Infrastructure as Code

If you're using IaC, ensure your app client has:

```hcl
resource "aws_cognito_user_pool_client" "app_client" {
  name         = "predixa-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  allowed_oauth_scopes = [
    "email",
    "openid",
    "profile"
  ]

  read_attributes  = ["email", "given_name", "family_name", "name"]
  write_attributes = ["email", "given_name", "family_name"]  # This is critical!
  
  # ... other settings
}
```

---

## Testing the Fix

After updating permissions:

1. **Clear browser cache** (important!)
2. **Sign out** of your app
3. **Sign back in** to refresh your authentication token
4. Try editing your name again

If it still doesn't work, check the browser console (F12) for the exact error message.

---

## Common Error Messages

### Error: "Attribute given_name is not writable"
- **Fix**: Add `given_name` to writable attributes in app client settings

### Error: "Insufficient permissions"
- **Fix**: Ensure read AND write permissions are set

### Error: "Token doesn't have required scopes"
- **Fix**: Sign out and back in to refresh the token

### Error: "Attribute already exists"
- **Fix**: This shouldn't happen for standard attributes. Try clearing the attribute first

---

## Still Having Issues?

1. **Check browser console** (F12 → Console tab)
2. **Look for the exact error message**
3. **Share it with me** and I can help debug further

The console logs I added will show:
- What values are being sent
- Whether the update succeeds or fails
- The exact error message from AWS

---

## Quick Checklist

Before contacting me with an issue:

- [ ] App client has `given_name` in writable attributes
- [ ] App client has `family_name` in writable attributes  
- [ ] You signed out and back in after making changes
- [ ] Cleared browser cache
- [ ] Checked browser console for error messages
- [ ] User Pool attributes are set as mutable

---

## IAM Permissions (Usually Not Needed)

The app client permissions are usually enough. You only need IAM permissions if:

- You're using a server-side API to update users (which you're not)
- You have Lambda triggers that restrict updates
- You've explicitly denied these operations in IAM

For client-side updates, app client write permissions are sufficient.

