# Quick Reference - Where Are My Files?

## ✅ Zip Files Location

Your Lambda deployment zip files are here:
```
backend/auth_billing/
├── post_confirmation.zip      ← Use for Post-Confirmation Lambda
├── stripe_webhook.zip         ← Use for Stripe Webhook Lambda
├── entitlements_api.zip       ← Use for Entitlements API Lambda
└── package/                   ← Dependencies (already installed)
```

## 📍 File Locations for Deployment

### When Uploading to Lambda Console:

1. **Post-Confirmation Lambda** → Upload `post_confirmation.zip`
2. **Stripe Webhook Lambda** → Upload `stripe_webhook.zip`
3. **Entitlements API Lambda** → Upload `entitlements_api.zip`

### Where to Find Them:

- **Full path**: `C:\Users\malin\Predixa\predixa-web\backend\auth_billing\`
- **Relative path**: `backend/auth_billing/` (from project root)

## 🚀 Next Steps

Since your zip files are ready:

1. ✅ **Step 1: Package Lambda Code** - DONE!
2. ⏭️ **Step 2: Create IAM Execution Role** - Do this next
3. ⏭️ **Step 3: Deploy Post-Confirmation Lambda** - Upload `post_confirmation.zip`
4. ⏭️ **Step 4: Deploy Stripe Webhook Lambda** - Upload `stripe_webhook.zip`
5. ⏭️ **Step 5: Deploy Entitlements API Lambda** - Upload `entitlements_api.zip`

## 💡 Tip

When the AWS Console asks you to "Upload from .zip file", navigate to:
```
C:\Users\malin\Predixa\predixa-web\backend\auth_billing\
```

Then select the appropriate zip file for each Lambda function.

---

**You're ready to proceed to Step 2!** Open `DEPLOY_VIA_CONSOLE.md` and continue from Step 2.

