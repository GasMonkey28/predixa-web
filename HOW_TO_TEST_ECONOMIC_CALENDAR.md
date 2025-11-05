# How to Test Economic Calendar API

## Step 1: Test the Diagnostic Endpoint

After deployment, visit this URL in your browser:
```
https://your-domain.vercel.app/api/test-economic-calendar
```

**What to look for:**
- `"isScraped": true` → Scraping is working ✅
- `"isScraped": false` → Using fallback data ❌
- `"eventsWithActual": 0` → No actual values extracted ❌
- `"eventsWithActual": > 0` → Actual values found ✅

## Step 2: Check Vercel Function Logs

1. Go to **Vercel Dashboard** → Your Project
2. Click on **Deployments** → Latest deployment
3. Click **Functions** tab
4. Find `/api/economic-calendar-investing`
5. Click **View Function Logs**
6. Look for logs starting with `[ECONOMIC CALENDAR]`

**What you might see:**

### ✅ Working (Real Data):
```
[ECONOMIC CALENDAR] Investing.com response status: 200
[ECONOMIC CALENDAR] Summary: {
  withActual: 5,
  withForecast: 10,
  withPrevious: 10
}
```

### ❌ Blocked (Fallback Data):
```
[ECONOMIC CALENDAR] BLOCKED: Got 403 Forbidden
Error: Investing.com blocked the request (403 Forbidden)
```

OR

```
[ECONOMIC CALENDAR] BLOCKED: Response appears to be a blocking page
```

## Step 3: Test the Actual API

Visit the actual endpoint:
```
https://your-domain.vercel.app/api/economic-calendar-investing
```

**Check the response:**
- Look for `"isScraped": true/false`
- Check if events have `actual` values (not null)
- If all `actual` values are `null`, it's using fallback data

## Step 4: Check the Daily Page

Visit your daily page and check:
- Does the economic calendar show actual values like "32K▲"?
- Or does it only show Forecast and Previous?

## If It's Blocked

If you see blocking messages, you have options:

1. **Quick Fix**: Use ScraperAPI (free tier available)
2. **Long-term**: Use a proper API like Trading Economics
3. See `ECONOMIC_CALENDAR_API_OPTIONS.md` for details

Let me know what you find and I can help implement a solution!

