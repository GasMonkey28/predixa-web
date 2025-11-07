# Configure Cognito Trigger via AWS CLI

If you can't find Lambda triggers in the Cognito Console UI, use AWS CLI instead.

## Quick Command

```bash
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_g5anv7 \
  --lambda-config PostConfirmation=arn:aws:lambda:us-east-1:822233328169:function:predixa-post-confirmation
```

## Step-by-Step

### 1. Get Your User Pool ID

Your User Pool ID is: `us-east-1_g5anv7` (from the sidebar)

Or get it from Cognito Console:
- Look at the User Pool ARN or ID at the top of the page
- Format: `us-east-1_XXXXXXXXX`

### 2. Get Your Lambda Function ARN

From Lambda Console:
1. Go to your function: `predixa-post-confirmation`
2. Look at **Function overview** (right side)
3. Copy the **Function ARN**
   - Format: `arn:aws:lambda:us-east-1:822233328169:function:predixa-post-confirmation`

### 3. Run the Command

**Windows PowerShell:**
```powershell
aws cognito-idp update-user-pool `
  --user-pool-id us-east-1_g5anv7 `
  --lambda-config PostConfirmation=arn:aws:lambda:us-east-1:822233328169:function:predixa-post-confirmation
```

**Linux/Mac:**
```bash
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_g5anv7 \
  --lambda-config PostConfirmation=arn:aws:lambda:us-east-1:822233328169:function:predixa-post-confirmation
```

### 4. Verify

1. Go to Lambda Console → `predixa-post-confirmation`
2. **Configuration** → **Triggers**
3. You should see the Cognito trigger listed

Or check Cognito:
1. Go to Cognito Console → Your User Pool
2. **User pool properties** tab → Scroll to **Lambda configuration**
3. Should show `predixa-post-confirmation` for Post confirmation

## Troubleshooting

### "User pool not found"
- Check your User Pool ID is correct
- Make sure you're using the right region

### "Lambda function not found"
- Check your Lambda function name is exactly: `predixa-post-confirmation`
- Make sure Lambda is in the same region as Cognito (us-east-1)

### "Access denied"
- Your AWS credentials need `cognito-idp:UpdateUserPool` permission

---

**This CLI method works 100% of the time, even if the UI doesn't show the option!**

