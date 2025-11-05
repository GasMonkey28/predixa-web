# Economic Calendar API Options

## The Problem

Investing.com is blocking/scraping requests in production, causing the app to fall back to mock data without actual values.

## Why It Works Locally But Not in Production

1. **IP Blocking**: Cloud providers (Vercel, AWS, etc.) have IP ranges that are often blocked by websites
2. **User-Agent Detection**: Websites detect and block automated requests
3. **Rate Limiting**: Production servers make more frequent requests and get rate-limited
4. **Anti-Bot Measures**: Cloudflare and other services detect and block scraping

## Solutions

### Option 1: Free Economic Calendar APIs (Recommended to Start)

#### A. Trading Economics API (Free Tier Available)
- **URL**: https://tradingeconomics.com/api
- **Free Tier**: Limited requests per month
- **Pros**: Official API, reliable data
- **Cons**: Free tier has limits
- **Setup**: Sign up for free API key

#### B. Alpha Vantage (Free Tier)
- **URL**: https://www.alphavantage.co/
- **Free Tier**: 5 API calls per minute, 500 calls per day
- **Pros**: Free, reliable, well-documented
- **Cons**: May not have economic calendar (check their offerings)
- **Setup**: Get free API key

#### C. Twelve Data (Free Tier)
- **URL**: https://twelvedata.com/
- **Free Tier**: 800 API calls per day
- **Pros**: Good free tier, economic indicators available
- **Cons**: May need to check if calendar is included
- **Setup**: Sign up for free account

### Option 2: Paid Economic Calendar APIs

#### A. Investing.com API (Official)
- **URL**: https://www.investing.com/api/
- **Cost**: Paid subscription
- **Pros**: Official data source, reliable
- **Cons**: Costs money

#### B. FXStreet Economic Calendar API
- **URL**: https://www.fxstreet.com/
- **Cost**: Contact for pricing
- **Pros**: Professional economic calendar data
- **Cons**: Paid service

#### C. MarketWatch Economic Calendar
- Check if they offer API access
- May require subscription

### Option 3: Use a Proxy/Scraping Service

#### A. ScraperAPI
- **URL**: https://www.scraperapi.com/
- **Free Tier**: 1,000 requests/month
- **Cost**: $29/month for 10,000 requests
- **How it works**: Routes requests through proxies to avoid blocking
- **Setup**: Use their API instead of direct axios calls

#### B. Bright Data (formerly Luminati)
- **URL**: https://brightdata.com/
- **Cost**: Paid service
- **Pros**: Professional scraping solution
- **Cons**: More expensive

### Option 4: Build Your Own Scraper with Better Headers

If you want to continue scraping, you could:
1. Use rotating proxies
2. Add more realistic headers
3. Implement delays between requests
4. Use a headless browser (Puppeteer/Playwright)

**Note**: This is more complex and may still get blocked.

## Recommended Next Steps

### Quick Fix (Start Here):
1. **Try ScraperAPI free tier** - Easiest solution that may work
2. **Check Trading Economics free tier** - If they have calendar API
3. **Use Alpha Vantage** - If they support economic calendar

### Long-term Solution:
1. **Sign up for a proper Economic Calendar API** (Trading Economics or Investing.com official API)
2. **Update the API route** to use the new API instead of scraping
3. **Add API key to environment variables**

## Implementation Example

If you get an API key, here's how to update the route:

```typescript
// In src/app/api/economic-calendar-investing/route.ts

export async function GET(request: Request) {
  try {
    const API_KEY = process.env.ECONOMIC_CALENDAR_API_KEY
    if (!API_KEY) {
      throw new Error('Economic calendar API key not configured')
    }
    
    // Example with Trading Economics API
    const response = await axios.get('https://api.tradingeconomics.com/calendar', {
      params: {
        c: API_KEY,
        format: 'json'
      }
    })
    
    // Transform to match your interface
    const events = response.data.map((event: any) => ({
      id: event.Id || `event-${Date.now()}`,
      time: event.DateTime || event.Time,
      event: event.Event || event.Title,
      impact: event.Importance || 2,
      country: event.Country || 'US',
      actual: event.Actual || null,
      forecast: event.Forecast || null,
      previous: event.Previous || null
    }))
    
    return NextResponse.json({ events, source: 'tradingeconomics.com' })
  } catch (error) {
    // Fallback logic
  }
}
```

## Environment Variable Setup

Add to your `.env.local` and Vercel environment variables:

```bash
ECONOMIC_CALENDAR_API_KEY=your_api_key_here
```

## Cost Estimate

- **Free APIs**: $0/month (with limits)
- **ScraperAPI**: $29/month (10K requests)
- **Trading Economics API**: $50-200/month (depending on tier)
- **Investing.com Official API**: Contact for pricing

## Next Steps

1. **Check Vercel logs** to confirm blocking (the improved error detection will show this)
2. **Try ScraperAPI free tier** first (quickest solution)
3. **If you need reliable data**, sign up for Trading Economics or similar
4. **Update the API route** to use the new service

Let me know which option you'd like to pursue and I can help implement it!

