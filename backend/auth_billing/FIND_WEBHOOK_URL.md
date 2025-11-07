# How to Find Your API Gateway Webhook URL

## Quick Method: From API Gateway Console

### Step 1: Go to API Gateway Console

1. **AWS Console** → **API Gateway** (or search for it)
2. **Select your API**: `predixa-stripe-webhook`
3. Click on it to open

### Step 2: Find the Invoke URL

**Option A: From Stages (Easiest)**

1. In the left sidebar, click **"Stages"**
2. Click on your stage (e.g., `prod`)
3. You'll see the **"Invoke URL"** at the top:
   ```
   https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod
   ```
4. **Your webhook URL** is:
   ```
   https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/stripe/webhook
   ```
   (Add `/stripe/webhook` to the end)

**Option B: From Resources**

1. Click **"Resources"** in the left sidebar
2. Navigate to `/stripe/webhook` resource
3. Click on the **GET** or **POST** method
4. Look at the top of the page - you'll see:
   ```
   Invoke URL: https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/stripe/webhook
   ```

**Option C: From API Details**

1. Click on your API name (`predixa-stripe-webhook`)
2. Look at the **"API endpoint"** section
3. You'll see the base URL
4. Add `/stripe/webhook` to it

## Full Webhook URL Format

Your webhook URL should look like:
```
https://[API-ID].execute-api.[REGION].amazonaws.com/[STAGE]/stripe/webhook
```

Example:
```
https://7hx1xklkac.execute-api.us-east-1.amazonaws.com/prod/stripe/webhook
```

## Verify the URL is Correct

1. **Copy the full URL** (including `/stripe/webhook`)
2. **Test it** (optional):
   - You can use a tool like Postman or curl to send a test POST request
   - Or just use it in Stripe - Stripe will test it when you create the webhook

## What to Do Next

1. **Copy the full webhook URL**
2. **Go to Stripe Dashboard** → Developers → Webhooks
3. **Paste it** in the "Endpoint URL" field when creating the webhook

---

**The URL is always in the API Gateway console - just look in Stages or Resources!** 🎯

