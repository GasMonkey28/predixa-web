# 🔑 Stripe Secret Key Recovery Guide

## ⚠️ Important: What a Secret Key Looks Like

**Stripe Secret Keys:**
- ✅ Start with `sk_live_` (production) or `sk_test_` (test)
- ✅ Are **32+ characters long** after the prefix
- ✅ Example format: `sk_live_51...` (followed by 32+ alphanumeric characters)

**NOT a Secret Key:**
- ❌ Short codes like `wncv-xckh-mtqq-dtsz-spzj` (these are verification/2FA codes)
- ❌ Codes without `sk_live_` or `sk_test_` prefix
- ❌ Webhook signing secrets (they start with `whsec_`)

## Why You Can't See It Again

Stripe only displays secret keys **once** when you create or reveal them. This is a security feature to prevent accidental exposure. Once you close the modal, you can't view it again.

---

## ✅ Solution 1: Check if It's Already Saved (Check First!)

### Check Vercel Environment Variables

1. Go to your **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Look for `STRIPE_SECRET_KEY`
5. If it exists, you can see the **first few characters** (e.g., `sk_live_51...`)
6. **You can't see the full key**, but you can verify it's there

### Check Local .env.local File

If you're working locally, check your `.env.local` file:

```bash
# Look for this file in your project root
.env.local
```

⚠️ **Note**: The full secret key won't be visible in Vercel UI (for security), but you can see if it's configured.

---

## ✅ Solution 2: Create a New Secret Key (If Not Saved)

If the key wasn't saved in Vercel and you need a new one:

### Step 1: Create New Secret Key in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Live Mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. In the **Secret keys** section, click **"Create secret key"** or **"Reveal test key"** button
5. **Copy the key immediately** - it starts with `sk_live_...`
6. **Save it somewhere safe** (password manager, secure note)

### Step 2: Add to Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `STRIPE_SECRET_KEY` (or create it if it doesn't exist)
3. Click **Edit** (or **Add**)
4. Paste the new secret key
5. Set scope to **Production** (or appropriate environment)
6. Click **Save**
7. **Redeploy** your application

---

## ✅ Solution 3: Use Restricted Keys (Recommended)

Instead of the main secret key, you can create **restricted API keys** with limited permissions:

1. Go to **Stripe Dashboard** → **Developers** → **API keys**
2. Click **"Create restricted key"**
3. Give it a name (e.g., "Predixa Web App")
4. Set permissions:
   - ✅ **Read** on Customers
   - ✅ **Write** on Customers
   - ✅ **Read** on Subscriptions
   - ✅ **Write** on Subscriptions
   - ✅ **Read** on Checkout Sessions
   - ✅ **Write** on Checkout Sessions
   - ✅ **Read** on Payment Methods
   - ✅ **Read** on Invoices
5. Click **Create key**
6. **Copy and save it immediately**
7. Use this restricted key instead of the main secret key

**Benefits:**
- ✅ More secure (limited permissions)
- ✅ Can be revoked without affecting other integrations
- ✅ Better for production

---

## 🔄 Solution 4: Rotate Keys (If Compromised)

If you think your key might be compromised or exposed:

### Step 1: Create New Secret Key
- Follow Solution 2 above

### Step 2: Update Vercel
- Update `STRIPE_SECRET_KEY` with new key

### Step 3: Revoke Old Key (Optional)
- In Stripe Dashboard → **Developers** → **API keys**
- Find the old key
- Click **"Revoke"** (if you suspect it's compromised)

⚠️ **Warning**: Revoking will immediately break any integrations using that key. Only do this if you're sure the old key is compromised.

---

## 📋 Quick Checklist

- [ ] Checked Vercel environment variables
- [ ] Checked local `.env.local` file
- [ ] Created new secret key in Stripe (if needed)
- [ ] Saved key securely (password manager)
- [ ] Updated Vercel environment variable
- [ ] Redeployed application
- [ ] Tested subscription flow

---

## 🎯 Recommended Approach

**For Launch:**

1. **Use Restricted API Key** (Solution 3) - Most secure
2. **Save it in Vercel** immediately after creating
3. **Test thoroughly** before going live
4. **Keep test keys** for development

---

## 🔍 How to Verify Your Key is Working

After updating the key in Vercel:

1. **Redeploy** your application
2. Go to your account page
3. Try to view subscription status
4. Check Vercel function logs for any Stripe errors
5. If you see "Invalid API key" errors, the key might be wrong

---

## 📝 Important Notes

- ⚠️ **Never commit secret keys to git** - They should only be in environment variables
- ⚠️ **Never share secret keys** - They give full access to your Stripe account
- ⚠️ **Rotate keys regularly** - Good security practice
- ✅ **Use restricted keys** - Better security than full access keys
- ✅ **Save keys immediately** - Stripe only shows them once

---

## 🆘 Still Having Issues?

If you're still having trouble:

1. **Check Stripe Dashboard** → **Developers** → **API keys** → See if you have multiple keys listed
2. **Verify you're in Live Mode** - Make sure the toggle is set to "Live" (not "Test")
3. **Check Vercel logs** - Look for Stripe API errors in function logs
4. **Contact Stripe Support** - If you need help, Stripe support can assist

---

## 💡 Pro Tip

Create a **restricted key** specifically for your web app with only the permissions it needs. This is more secure and easier to manage than using your main secret key.

