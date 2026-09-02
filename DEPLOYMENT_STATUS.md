# 🚀 Deployment Status

## Operational toggles

- **Close new registration:** set `NEXT_PUBLIC_DISABLE_SIGNUP=true` in the
  Vercel env for the target project/environment, then redeploy. Full details
  (what it blocks, the Cognito hard-lock, how to reopen): **`DISABLE_SIGNUP.md`**.
  Intended ON for the **predixatest** deployment while it's in testing.

---

## ✅ Completed

1. **Code pushed to GitHub** - All changes committed
2. **Local environment** - Working with AWS credentials
3. **DynamoDB table** - Created and accessible
4. **IAM setup** - Identity Pool created
5. **Google/Apple sign-in** - Working
6. **Profile editing** - Working locally

---

## ⏳ Pending: Production Deployment

### What's Missing

Production site (`predixasweb.com`) needs AWS credentials in Vercel environment variables.

### Next Steps

1. ✅ Code is already on GitHub
2. ⏳ Add AWS credentials to Vercel (see `VERCEL_PRODUCTION_SETUP.md`)
3. ⏳ Redeploy on Vercel
4. ⏳ Test on production site

---

## Local vs Production

| Feature | Local | Production |
|---------|-------|------------|
| Google Sign-In | ✅ | ✅ |
| Apple Sign-In | ✅ | ✅ |
| Email Sign-In | ✅ | ✅ |
| Profile Edit (Email) | ✅ | ✅ |
| Profile Edit (Google) | ✅ | ⏳ Need credentials |
| Profile Edit (Apple) | ✅ | ⏳ Need credentials |

**Note:** Email users work everywhere. OAuth users need DynamoDB credentials.

---

## To Complete Deployment

Add environment variables to Vercel and redeploy.

Read: `VERCEL_PRODUCTION_SETUP.md`



































