# Fix Railway Port Mismatch

## The Problem

Railway is running your server on port **8080**, but the domain was configured for port **3000**. This causes "Application failed to respond" errors.

## Solution: Update Railway Domain Port

### Option 1: Update Domain Port (Recommended)

1. Go to **Railway Dashboard** → Your Project → Your Service
2. Click **"Settings"** tab
3. Go to **"Networking"** section
4. Find your **Public Domain** (or click "Generate Domain" if you need to)
5. Click on the domain or **"Edit"** button
6. Change the port from **3000** to **8080**
7. Save/Redeploy

### Option 2: Set PORT Environment Variable

1. Go to **Railway Dashboard** → Your Project → Your Service
2. Click **"Variables"** tab
3. Add new variable:
   - **Name**: `PORT`
   - **Value**: `3000`
4. Save (Railway will redeploy)
5. Then update domain to use port **3000**

### Option 3: Update Domain to Use Railway's Auto Port (8080)

The easiest fix:
1. Go to **Settings** → **Networking**
2. Find your public domain
3. Edit it and set port to **8080**
4. Save

## After Fixing

Test again:
```
https://predixa-web-production.up.railway.app/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## Why This Happened

Railway automatically sets `PORT` to 8080, but when you generated the domain, you specified port 3000. The domain needs to match the actual port the server is listening on.

