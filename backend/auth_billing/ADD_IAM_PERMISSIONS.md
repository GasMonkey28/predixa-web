# Add IAM Permissions for Delete User Lambda

## Current Status
Your `predixa-lambda-execution-role` currently only has:
- CloudWatch Logs permissions (for logging)

## Required Permissions
You need to add:
1. **DynamoDB DeleteItem** - for deleting from UserProfiles and predixa_entitlements tables
2. **Cognito AdminDeleteUser** - for deleting users from Cognito

---

## Step-by-Step: Add Permissions via AWS Console

### Option 1: Edit the Role Directly (Recommended)

1. **From Lambda Console:**
   - In the Permissions tab, click on the role name: `predixa-lambda-execution-role`
   - This opens the IAM Console for that role

2. **Add Inline Policy:**
   - Click **"Add permissions"** → **"Create inline policy"**
   - Click **"JSON"** tab
   - Paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": [
                "arn:aws:dynamodb:us-east-1:*:table/UserProfiles",
                "arn:aws:dynamodb:us-east-1:*:table/predixa_entitlements"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:AdminDeleteUser"
            ],
            "Resource": "arn:aws:cognito-idp:us-east-1:*:userpool/*"
        }
    ]
}
```

3. **Replace region if needed:**
   - If your region is NOT `us-east-1`, replace all instances of `us-east-1` with your region
   - Example: `us-west-2`, `eu-west-1`, etc.

4. **Review and name:**
   - Click **"Next"**
   - Policy name: `DeleteUserPermissions` (or any name you prefer)
   - Click **"Create policy"**

---

### Option 2: Add Permissions via Lambda Console

1. **In Lambda Console → Permissions tab:**
   - Click **"Edit"** button next to "Execution role"
   - This opens a modal

2. **Add permissions:**
   - You can add permissions here, but it's easier to go to IAM Console directly
   - Click on the role name link to open IAM Console
   - Follow Option 1 above

---

## Verify Permissions

After adding the policy, verify it's there:

1. **In IAM Console → Roles → predixa-lambda-execution-role:**
   - You should see:
     - **Managed policies**: `AWSLambdaBasicExecutionRole` (for CloudWatch Logs)
     - **Inline policies**: `DeleteUserPermissions` (or whatever you named it)

2. **Check permissions:**
   - Click on the inline policy name
   - Verify it has:
     - DynamoDB: `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`
     - Cognito: `AdminDeleteUser`

---

## Alternative: Use AWS CLI

If you prefer CLI, run this (replace `us-east-1` with your region):

```powershell
aws iam put-role-policy `
    --role-name predixa-lambda-execution-role `
    --policy-name DeleteUserPermissions `
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem"
                ],
                "Resource": [
                    "arn:aws:dynamodb:us-east-1:*:table/UserProfiles",
                    "arn:aws:dynamodb:us-east-1:*:table/predixa_entitlements"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "cognito-idp:AdminDeleteUser"
                ],
                "Resource": "arn:aws:cognito-idp:us-east-1:*:userpool/*"
            }
        ]
    }'
```

---

## What This Policy Does

### DynamoDB Permissions:
- `GetItem` - Read user data (to get Stripe customer ID)
- `PutItem` - Create/update (already have, but included for completeness)
- `UpdateItem` - Update (already have, but included for completeness)
- `DeleteItem` - **NEW** - Delete from UserProfiles and predixa_entitlements tables

### Cognito Permissions:
- `AdminDeleteUser` - **NEW** - Delete user from Cognito User Pool

---

## After Adding Permissions

1. **Go back to Lambda Console**
2. **Refresh the Permissions tab** (click refresh icon)
3. **You should now see:**
   - Amazon CloudWatch Logs: 3 actions
   - Amazon DynamoDB: 4 actions (including DeleteItem)
   - Amazon Cognito: 1 action (AdminDeleteUser)

---

## Troubleshooting

**Permission denied errors:**
- Wait 1-2 minutes after adding permissions (IAM propagation delay)
- Verify the resource ARNs match your actual table names and region
- Check the policy was created successfully in IAM Console

**Can't see new permissions in Lambda:**
- Click the refresh icon in Lambda Permissions tab
- The view may take a moment to update


