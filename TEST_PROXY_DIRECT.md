# Test Railway Proxy Directly

## Step 1: Test Railway Proxy

Visit this URL in your browser (replace with your Railway URL):
```
https://predixa-web-production.up.railway.app/?url=https://www.investing.com/economic-calendar/
```

**What should happen:**
- If working: You'll see HTML from Investing.com
- If not working: You'll see an error or timeout

## Step 2: Check Railway Logs

1. Go to **Railway Dashboard** → Your Project → Your Service
2. Click **"Deploy Logs"** or **"HTTP Logs"** tab
3. Look for:
   - Requests coming in
   - Any errors
   - "Proxying request to:" messages

## Step 3: Check Vercel Logs

1. Go to **Vercel Dashboard** → Your Project → Deployments → Latest
2. Click **Functions** → `/api/economic-calendar-investing` → **View Function Logs**
3. Look for:
   - `[ECONOMIC CALENDAR] Using custom proxy server:`
   - `[ECONOMIC CALENDAR] Error fetching from investing.com:`
   - The actual error message

## Common Issues

1. **Railway proxy timeout** - Investing.com might be slow
2. **Railway proxy error** - Check Railway logs
3. **CORS issue** - Railway proxy might need CORS headers
4. **URL encoding issue** - The URL parameter might not be encoded correctly

