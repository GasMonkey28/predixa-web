# How to Find Your Railway URL

## Step-by-Step:

### 1. Go to Railway Dashboard
- Visit: https://railway.app/
- Log in with your GitHub account

### 2. Find Your Project
- You should see a project card (might be named after your repo or "economic-calendar-proxy")
- **Click on the project**

### 3. Find Your Service
- Inside the project, you'll see your service (Node.js app)
- **Click on the service** (the card/box representing your app)

### 4. Find the URL
The URL appears in **one of these places**:

#### Option A: Top of Service Page
- Look at the top of the service page
- You should see a URL like: `https://your-app-name.up.railway.app`
- There might be a "Copy" button next to it

#### Option B: Settings Tab
1. Click on **"Settings"** tab (top of the service page)
2. Scroll down to **"Domains"** section
3. You'll see the public URL there

#### Option C: Service Overview
- On the service main page, look for a section showing:
  - **"Public Domain"** or
  - **"Custom Domain"** or  
  - Just the URL itself

### 5. If You Don't See a URL

If there's no URL visible, the service might need to be exposed:

1. Go to **Settings** tab
2. Look for **"Generate Domain"** button
3. Click it to generate a public URL

### 6. Test the URL

Once you have the URL, test it:
```
https://your-url.up.railway.app/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## Common Railway URL Format

Railway URLs look like:
- `https://your-app-name-production.up.railway.app`
- `https://your-app-name.up.railway.app`
- `https://random-words.up.railway.app`

## Still Can't Find It?

If you still can't find it:
1. Check Railway logs - sometimes the URL is shown there
2. Check your email - Railway might have sent deployment confirmation
3. Make sure the service is actually deployed (check the "Deployments" tab)

