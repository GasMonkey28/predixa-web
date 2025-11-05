# Railway Proxy Server Setup - Step by Step

Since you already have Railway connected to GitHub, here's what to do:

## Step 1: Create New GitHub Repository

1. Go to GitHub and create a **new repository** (can be private)
2. Name it something like: `economic-calendar-proxy`
3. Don't initialize with README (we'll add files)

## Step 2: Push Proxy Server Files

The files are already in your repo at `railway-proxy-server/`. You have two options:

### Option A: Create a separate repo (Recommended)
1. Copy these files to a new folder on your computer:
   - `railway-proxy-server/server.js`
   - `railway-proxy-server/package.json`
   - `railway-proxy-server/README.md`
   - `railway-proxy-server/.gitignore` (I'll create this)
2. In that folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/economic-calendar-proxy.git
   git push -u origin main
   ```

### Option B: Deploy from this repo's folder
1. In Railway, deploy from this repo
2. Set the **Root Directory** to: `railway-proxy-server`
3. Railway will deploy just that folder

## Step 3: Deploy to Railway

1. Go to **Railway Dashboard**
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repo (or this repo with root directory set to `railway-proxy-server`)
5. Railway will auto-detect Node.js and deploy
6. Wait for deployment to complete (usually 1-2 minutes)

## Step 4: Get Your Proxy URL

1. After deployment, Railway will show you a URL like:
   ```
   https://economic-calendar-proxy-production.up.railway.app
   ```
2. Click on the service
3. Go to **"Settings"** tab
4. Under **"Domains"**, you'll see the public URL
5. **Copy this URL** (you'll need it next)

## Step 5: Test the Proxy

Open in browser:
```
https://your-proxy-url.up.railway.app/health
```

Should return:
```json
{"status":"ok","timestamp":"2024-..."}
```

## Step 6: Add to Vercel

1. Go to **Vercel Dashboard** → Your Project (`predixa-web`)
2. Go to **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Add:
   - **Name**: `CUSTOM_PROXY_URL`
   - **Value**: `https://your-proxy-url.up.railway.app` (paste from Step 4)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

## Step 7: Redeploy Vercel

1. Go to **Deployments** tab in Vercel
2. Click **"..."** on latest deployment → **"Redeploy"**
3. Or push a new commit to trigger redeploy

## Step 8: Test It!

After redeploy, visit:
```
https://your-domain.vercel.app/api/test-economic-calendar
```

You should now see:
- `"isScraped": true` ✅
- `"eventsWithActual": > 0` ✅
- Events with actual values!

## Troubleshooting

**If proxy doesn't work:**
1. Check Railway logs: Railway Dashboard → Your Service → Logs
2. Test proxy directly: `https://your-proxy-url.up.railway.app/?url=https://www.investing.com/economic-calendar/`
3. Check Vercel logs for `[ECONOMIC CALENDAR] Using custom proxy server`

**If Railway asks for payment:**
- Railway free tier is $5 credit/month
- This proxy uses very little resources
- You should be fine on free tier

## Cost

- **Railway**: $0/month (free tier covers this)
- **Vercel**: Already free
- **Total**: $0/month ✅

