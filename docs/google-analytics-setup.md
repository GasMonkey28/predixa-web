# Google Analytics Setup Guide

This guide explains how to set up Google Analytics (GA4) for your Predixa website to track daily visitors.

## Prerequisites

✅ You already have a Google Analytics account from a previous project

## Step 1: Get Your Measurement ID

1. Go to [analytics.google.com](https://analytics.google.com)
2. Sign in with your Google account
3. Select your existing account (or create a new property if needed)
4. Click on **Admin** (gear icon) in the bottom left
5. In the **Property** column, click **Data Streams**
6. Click on your web data stream (or create a new one if needed)
7. Copy your **Measurement ID** (it starts with `G-`, for example: `G-XXXXXXXXXX`)

## Step 2: Add Measurement ID to Environment Variables

### For Local Development

Create or update `.env.local` in your project root:

```bash
# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Measurement ID.

### For Production (Vercel)

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Add:
   - **Key:** `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - **Value:** `G-XXXXXXXXXX` (your Measurement ID)
   - **Environments:** Select all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application for the changes to take effect

## Step 3: Verify It's Working

1. **Restart your development server** (if running locally):
   ```bash
   npm run dev
   ```

2. **Visit your website** in a browser

3. **Check Google Analytics:**
   - Go to [analytics.google.com](https://analytics.google.com)
   - Click on **Reports** → **Realtime**
   - You should see at least 1 active user (yourself) within 30 seconds

4. **Wait a few hours** and check:
   - Go to **Reports** → **Engagement** → **Overview**
   - You'll see daily visitor counts, page views, and other metrics

## Viewing Daily Visitors

Once data is being collected:

1. Go to **Reports** → **Engagement** → **Overview**
2. Set the date range to view specific days or months
3. You'll see:
   - **Users** (daily visitors)
   - **New users**
   - **Event count**
   - **Key events**

## Troubleshooting

### No Data Showing

- **Wait 24-48 hours** for initial data collection
- Check that `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set correctly in your environment variables
- Verify the Measurement ID starts with `G-`
- Make sure you've redeployed after adding the environment variable
- Check browser console for any errors

### Still Not Working

1. Verify the tracking code is loaded:
   - Open browser DevTools (F12)
   - Go to **Network** tab
   - Filter for `gtag` or `google-analytics`
   - You should see requests to `googletagmanager.com`

2. Check the component is rendered:
   - The `GoogleAnalytics` component is in `src/app/layout.tsx`
   - It only renders if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set

## Code Implementation

The Google Analytics implementation consists of:

- **Component:** `src/components/GoogleAnalytics.tsx`
- **Layout:** `src/app/layout.tsx` (includes the component)

The tracking code automatically:
- Loads the Google Analytics script
- Tracks page views
- Tracks user interactions
- Works with Next.js App Router

## Privacy Notes

- Google Analytics collects anonymous usage data
- Consider adding a cookie consent banner if required by your jurisdiction (GDPR, CCPA, etc.)
- You can configure data retention and privacy settings in Google Analytics Admin

---

**Next Steps:**
1. ✅ Get your Measurement ID from Google Analytics
2. ✅ Add it to `.env.local` for local development
3. ✅ Add it to Vercel environment variables for production
4. ✅ Redeploy and verify it's working

