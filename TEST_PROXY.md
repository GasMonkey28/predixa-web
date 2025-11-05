# Test Your Proxy Setup

## Step 1: Test Railway Proxy Health

Visit this URL in your browser (replace with your Railway URL):
```
https://your-railway-url.up.railway.app/health
```

Should return:
```json
{"status":"ok","timestamp":"2024-..."}
```

## Step 2: Test Economic Calendar API

Visit this URL:
```
https://your-domain.vercel.app/api/test-economic-calendar
```

**What to look for:**
- ✅ `"isScraped": true` - Proxy is working!
- ✅ `"eventsWithActual": > 0` - Actual values are being extracted!
- ✅ Events show `"actual": "32K▲"` or similar values

**If you see:**
- ❌ `"isScraped": false` - Proxy might not be working
- ❌ `"eventsWithActual": 0` - Scraping might still be blocked
- ❌ `"isFallbackData": true` - Using mock data

## Step 3: Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project → Deployments → Latest
2. Click **Functions** tab
3. Find `/api/economic-calendar-investing`
4. Click **View Function Logs**
5. Look for:
   - `[ECONOMIC CALENDAR] Using custom proxy server` ✅
   - `[ECONOMIC CALENDAR] Summary:` with statistics

## Step 4: Check Daily Page

Visit your daily page and check the economic calendar:
- Should show **Actual: 32K▲** (or similar)
- Not just Forecast and Previous

## Troubleshooting

**If proxy doesn't work:**
1. Check Railway logs: Railway Dashboard → Your Service → Logs
2. Verify `CUSTOM_PROXY_URL` in Vercel matches Railway URL exactly
3. Make sure Railway service is running (check Railway dashboard)

**If still blocked:**
- Railway might also be getting blocked
- Consider using FRED API instead (100% free, no blocking)

