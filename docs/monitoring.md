# Monitoring & Alerts

This guide explains how to wire production telemetry into actionable notifications. Sentry is already integrated in the codebase; the steps below add CloudWatch alarms for AWS resources and Vercel request alerts.

---

## 1. AWS CloudWatch Alarms (Lambda / DynamoDB)

### 1.1 Create an SNS topic for notifications
1. Open **Amazon SNS** → **Topics** → **Create topic**.
2. Type: `Standard`, name: `predixa-alerts`.
3. Add an email subscription (or Slack webhook via HTTPS). Confirm the email subscription.

### 1.2 Lambda error alarm (entitlements API)
1. In **CloudWatch** → **Alarms** → **All alarms** → **Create alarm**.
2. Select metric:
   - Namespace: `AWS/Lambda`
   - Function: `entitlements_api_lambda` (or whichever function handles subscription status)
   - Metric: `Errors`
3. Conditions:
   - Statistic: `Sum`
   - Period: `1 Minute`
   - Threshold: `>= 1` for `1 out of 5` datapoints (adjust as needed).
4. Configure actions:
   - Add notification to the SNS topic `predixa-alerts`.
5. Name the alarm `entitlements-errors`.

Repeat for:
- `stripe_webhook_lambda` → Metric `Errors`
- `post_confirmation_lambda` (if you require alerts for sign-up events)
- Optional: metric `Throttles` with a threshold > 0, period `5 minutes`.

### 1.3 DynamoDB throttles alarm
1. Metric namespace: `AWS/DynamoDB`
2. Table: `predixa_entitlements`
3. Metrics: `ReadThrottleEvents`, `WriteThrottleEvents`
4. Threshold: `>= 1` for `1 datapoint`. Notify via SNS.

### 1.4 Log Insights query (optional dashboard)
Use the following query in **CloudWatch Logs Insights** for your Lambda log group to spot recurring issues:
```sql
fields @timestamp, @message
| filter @message like /error/i
| stats count() by bin(5m)
```

---

## 2. Vercel Alerts (Frontend / API routes)

### 2.1 Configure Production error alert
1. In **Vercel** → select the `predixa-web` project → **Settings → Alerts**.
2. Click **Create Alert**.
3. Alert type: `Response errors`.
4. Condition: “5xx responses ≥ 5 within 5 minutes” (tweak based on traffic).
5. Delivery: email or Slack integration.

### 2.2 Slow response alert (optional)
1. Create another alert for `Response time`.
2. Condition: “P95 response time ≥ 2s within 5 minutes.”
3. Notify via same channel.

### 2.3 Log drain (optional)
1. Settings → **Logs** → **Add Log Drain** (Datadog, Logflare, etc.).
2. Use the drain URL in your logging provider for long-term retention.

---

## 3. Sentry Alerts (Errors & Performance)

The SDK is already integrated—create alert rules:

### 3.1 Issue Alert
1. In Sentry: **Alerts → Create Alert Rule → Issues**.
2. Condition: “An issue is first seen” (filter environment `production`).
3. Action: Email, Slack, or PagerDuty.

### 3.2 Metric Alert (optional)
1. **Alerts → Metric Alerts → Errors**.
2. Condition: “`event.type:error AND environment:production` > 5 within 10 minutes.”
3. Action: Slack/email.

### 3.3 Performance issues
1. Create a metric alert on “transaction duration” if you enable tracing (`SENTRY_TRACES_SAMPLE_RATE > 0`).

---

## 4. Runbook Summary

- **Sentry:** catches uncaught exceptions, alert on new issues.
- **CloudWatch:** monitors AWS Lambda/DynamoDB health for subscription flows.
- **Vercel Alerts:** monitors Next.js routes for 4xx/5xx spikes and latency.
- **SNS Topic:** central delivery channel; feed into Slack, OpsGenie, PagerDuty, etc.

Update these alert thresholds as real traffic patterns emerge. Add the alert configuration to your incident response playbook so responders know where notifications originate.***

