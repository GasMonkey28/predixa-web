# Predixa Ops Handbook

This guide summarizes the operational steps required to keep the Predixa web platform healthy in production. It consolidates the scattered `FIX_*` and `*_SETUP` notes into one place. Update it whenever the stack or runbooks change.

---

## 1. Environment & Configuration

| Variable | Purpose | Location |
| --- | --- | --- |
| `NEXT_PUBLIC_AWS_REGION` | Primary AWS region (Cognito, DynamoDB, S3) | Vercel / `.env.local` |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito user pool for web clients | Vercel / `.env.local` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Web app client ID | Vercel / `.env.local` |
| `NEXT_PUBLIC_COGNITO_DOMAIN` | Hosted UI domain | Vercel / `.env.local` |
| `NEXT_PUBLIC_IDENTITY_POOL_ID` | (Optional) Cognito Identity pool for DynamoDB access | Vercel / `.env.local` |
| `STRIPE_SECRET_KEY` | Server-side Stripe API key | Vercel / secrets manager |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe key | Vercel / `.env.local` |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` / `YEARLY` | Product price IDs | Vercel / `.env.local` |
| `ENTITLEMENTS_API_GATEWAY_URL` | AWS API Gateway endpoint for subscription checks | Vercel |
| `ENTITLEMENTS_TABLE` | DynamoDB table for entitlements (defaults to `predixa_entitlements`) | AWS |
| `NEXT_PUBLIC_S3_BUCKET` | S3 bucket with `bars/` & `summary_json/` data | Vercel / `.env.local` |
| `NEXT_PUBLIC_TICKER` | Default asset symbol (e.g., `SPY`) | Vercel / `.env.local` |
| `SCRAPER_API_KEY` / `CUSTOM_PROXY_URL` | Optional investing.com scraping helpers | Vercel |
| `FRED_API_KEY` | Optional fallback economic-calendar data | Vercel |

Use the `npm run build` prebuild guard (also exercised in CI) to catch missing required variables before deploying.

---

## 2. Deployments

### Web (Vercel)
1. Create a PR and ensure GitHub Actions passes (`lint`, `type-check`, `build`).
2. Merge to `master`; Vercel auto-builds using the same env vars.
3. Validate staging preview (auth flow, `/daily`, `/account`, checkout) before promoting to production.

### AWS Lambdas / Entitlements
The `backend/auth_billing` tree contains zipped Lambda packages (`entitlements_api.zip`, `post_confirmation.zip`, `stripe_webhook.zip`). When modifications are required:
1. Update the Python source.
2. Rebuild the zip (see scripts inside the directory or the existing FIX docs for reference).
3. Upload via AWS Console or CI pipeline linked to that folder.
4. Smoke-test `/api/entitlements` via the web app and monitor CloudWatch logs.

---

## 3. Subscription & Billing Flow

1. **Auth → Cognito**  
   - Ensure the user pool app client has the same callback/logout URLs as configured in `src/lib/amplify.ts`.
   - Social sign-in (Google/Apple) requires proper OAuth scopes; see `SOCIAL_AUTH_SETUP.md`.

2. **Checkout → Stripe**  
   - `create-checkout-session` creates customers and subscriptions. Confirm product IDs, trial metadata, and Stripe Portal configuration (see `STRIPE_PORTAL_SETUP.md`).
   - Webhook (`backend/auth_billing/stripe_webhook.zip`) writes the latest status to DynamoDB entitlements.

3. **Entitlements → DynamoDB**  
   - `ENTITLEMENTS_API_GATEWAY_URL` returns a unified access decision. Check CloudWatch logs (`entitlements_api_lambda`) if the middleware is denying legitimate subscribers.
   - Periodically run `scripts/sync-profiles.ts` to backfill user metadata when needed.

4. **RevenueCat (mobile clients)**  
   - The webhook in `/api/revenuecat/webhook` updates Cognito or DynamoDB to honor mobile purchases.

---

## 4. Market Data Pipeline (S3)

1. Upstream jobs deposit JSON into S3:
   - `bars/<ticker>/15min/latest.json`
   - `summary_json/<yyyy-mm-dd>.json`
2. `/api/bars/daily` and `/api/tiers/daily` read these files directly. If the data feed stalls:
   - Check the S3 bucket for the day’s objects.
   - Run the ingestion scripts (see `CREATE_LIVE_PRICE_IF_MISSING.md`, `VERIFY_PRICE_IS_LIVE.md`).
   - Ensure IAM permissions allow public GET or signed URLs, depending on the bucket policy.
3. The frontend logs a 500 if the summary file is missing—upload a placeholder file to keep the UI responsive while investigating.

---

## 5. Monitoring & Alerts

| Component | Monitoring | Suggested Actions |
| --- | --- | --- |
| Vercel Next.js | Vercel dashboard, Web analytics, Sentry (`SENTRY_DSN`) | Track slow endpoint logs; raise Sentry alerts on uncaught errors. |
| Stripe | Dashboard → Developers → Logs | Verify webhook deliveries, subscription events, portal sessions. |
| AWS Lambda (entitlements/webhooks) | CloudWatch Logs | Set alarms on errors/timeouts. |
| DynamoDB Entitlements | CloudWatch metrics | Alert on throttled writes/reads; ensure TTL cleanup. |
| S3 Market Data | S3 Inventory / scheduled Lambda check | Alert when latest files are older than trading day. |

Add uptime checks for key routes (`/`, `/daily`, `/account`, `/api/entitlements`) once production is stable.

---

## 6. Incident & Recovery Playbook

### Authentication Failures
1. Confirm Cognito hosted UI status page.
2. Use `/api/debug-auth` **(disabled in prod)** or AWS console to verify client IDs.
3. Rotate app client secret if compromised; update env vars and redeploy.

### Checkout/Subscription Issues
1. Check `/account` for error messages (Stripe portal misconfiguration is common).
2. Inspect Stripe logs; re-run webhook events for missed deliveries.
3. If DynamoDB entitlements are stale, run the sync script or manually update the record.

### Market Data Outages
1. Confirm upstream job status (see `SUMMARY.md`, `UPDATE_TO_LIVE_PRICE_IDS.md`).
2. Upload a temporary summary file with neutral tiers to restore UI access.

### General Rollback
1. Revert the Vercel deployment to the previous good build.
2. Re-deploy Lambda zips from the latest working archive.
3. Document root cause and update this runbook if a new step was required.

---

## 7. Useful Scripts & References

- `scripts/sync-profiles.ts`: Syncs Cognito attributes with DynamoDB profile records.
- `fix-cognito-permissions.ps1`: Example IAM permission fix for local debugging.
- `QUICK_FIX_ENV_SETUP.md`, `FIX_PRODUCTION_IAM.md`: Historical fixes—fold relevant learnings into the sections above when time allows.
- Mobile apps & charts (`OptiSpark/`, `attractiveChart/`) rely on the same data sources; coordinate releases if API contracts change.

---

Keep this document as the single source of truth for operations. Remove or archive individual `FIX_*` files once their content has been migrated here to avoid drift.

