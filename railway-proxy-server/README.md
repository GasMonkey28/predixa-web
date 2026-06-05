# Economic Calendar Proxy Server

Simple proxy server for bypassing Investing.com blocking.

## Quick Deploy to Railway

1. Railway → connect GitHub repo `predixa-web`
2. **Settings → Root Directory:** `railway-proxy-server`
3. Build uses **Dockerfile** (avoids Next.js CVE checks on the main app)
4. Deploy and copy the public URL
5. Vercel → `CUSTOM_PROXY_URL` = that URL (no trailing slash), then redeploy Vercel

Test calendar HTML via proxy:

```
https://YOUR-RAILWAY-URL/?url=https://www.investing.com/economic-calendar
```

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

