# Economic Calendar Proxy Server

Simple proxy server for bypassing Investing.com blocking.

## Quick Deploy to Railway

1. Create a new GitHub repo (or use this folder)
2. Push these files to the repo
3. In Railway, click "New Project" → "Deploy from GitHub repo"
4. Select your repo
5. Railway will auto-detect and deploy
6. Copy the URL Railway gives you
7. Add it to Vercel as `CUSTOM_PROXY_URL` environment variable

## Files Needed

- `server.js` - The proxy server
- `package.json` - Dependencies

## Railway Settings

- **Port**: Railway will auto-set `PORT` environment variable
- **No other config needed!**

## Test

After deployment, test:
```
https://your-app.up.railway.app/health
```

Should return: `{"status":"ok","timestamp":"..."}`

