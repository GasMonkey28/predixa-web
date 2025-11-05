# ScraperAPI Setup Guide

## Quick Fix for Economic Calendar Blocking

Investing.com is blocking requests from Vercel (403 Forbidden). ScraperAPI routes requests through proxies to bypass blocking.

## Step 1: Sign Up for ScraperAPI (Free)

1. Go to: https://www.scraperapi.com/
2. Click **"Start Free Trial"** or **"Sign Up"**
3. Create account (free tier: 1,000 requests/month)
4. After signup, go to **Dashboard** → **API Keys**
5. Copy your API key (looks like: `abc123def456...`)

## Step 2: Add API Key to Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Add:
   - **Name**: `SCRAPER_API_KEY`
   - **Value**: Your ScraperAPI key (paste from Step 1)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

## Step 3: Redeploy

After adding the environment variable:

1. Go to **Deployments** tab
2. Click **"..."** on latest deployment → **"Redeploy"**
3. Or push a new commit to trigger redeploy

## Step 4: Test

After redeploy, visit:
```
https://your-domain.vercel.app/api/test-economic-calendar
```

You should now see:
- `"isScraped": true` ✅
- `"eventsWithActual": > 0` ✅
- Events with actual values like "32K▲"

## Cost

- **Free Tier**: 1,000 requests/month (enough for ~30 requests/day)
- **Starter Plan**: $29/month for 10,000 requests
- **Business Plan**: $99/month for 100,000 requests

For economic calendar (1 request per page load), the free tier should be sufficient for testing and moderate traffic.

## Alternative: Use a Real Economic Calendar API

If you want a more reliable long-term solution, consider:
- **Trading Economics API** - Professional economic calendar data
- **Investing.com Official API** - Direct from source
- See `ECONOMIC_CALENDAR_API_OPTIONS.md` for full list

## Troubleshooting

If it still doesn't work:
1. Check Vercel logs for `[ECONOMIC CALENDAR]` messages
2. Verify API key is set correctly in Vercel
3. Check ScraperAPI dashboard for usage/errors
4. Make sure you redeployed after adding the env variable

