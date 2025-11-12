# Google Analytics Measurement ID

Your Google Analytics Measurement ID: **G-0KHXN58F7S**

## Quick Setup

### Add to `.env.local` (Local Development)

Add this line to your `.env.local` file:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-0KHXN58F7S
```

If you don't have a `.env.local` file, create it in the project root with this content.

### Add to Vercel (Production)

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Add:
   - **Key:** `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - **Value:** `G-0KHXN58F7S`
   - **Environments:** Select all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application

## Test It

1. Restart your dev server: `npm run dev`
2. Visit your website
3. Check Google Analytics → Reports → Realtime
4. You should see your visit within 30 seconds!

---

**Note:** The tracking code is already integrated in your app. You just need to add this environment variable!

