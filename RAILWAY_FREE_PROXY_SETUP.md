# Railway Free Proxy Server Setup (100% Free)

## Step 1: Create Railway Account

1. Go to: https://railway.app/
2. Sign up with GitHub (free)
3. Railway gives you $5 free credit per month (enough for this proxy)

## Step 2: Deploy Proxy Server

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Create a new repo with the files in `railway-proxy-server/`:
   - `server.js`
   - `package.json`
4. Connect the repo to Railway
5. Railway will auto-detect and deploy

## Step 3: Get Your Proxy URL

1. After deployment, Railway will give you a URL like:
   ```
   https://your-app-name.up.railway.app
   ```
2. Copy this URL

## Step 4: Add to Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add new variable:
   - **Name**: `CUSTOM_PROXY_URL`
   - **Value**: `https://your-app-name.up.railway.app` (your Railway URL)
   - **Environment**: Select all
3. Save

## Step 5: Redeploy Vercel

After adding the environment variable, redeploy your Vercel project.

## Cost

- **Railway**: $5 free credit/month (enough for ~1000 requests)
- **Total Cost**: $0/month ✅

## How It Works

1. Your Vercel app requests economic calendar
2. Request goes through your Railway proxy server
3. Railway proxy fetches from Investing.com (different IP, not blocked)
4. Proxy returns the HTML to your Vercel app
5. Your app extracts the data

## Troubleshooting

If it doesn't work:
1. Check Railway logs to see if proxy is running
2. Test proxy directly: `https://your-proxy-url.up.railway.app/?url=https://www.investing.com/economic-calendar/`
3. Check Vercel logs for `[ECONOMIC CALENDAR] Using custom proxy server`

## Alternative: Use FRED API Instead

If you want a completely free solution without any setup:
- Use FRED API (completely free, no setup needed)
- See `FREE_PROXY_SOLUTION.md` for details

