# UX & Performance Review Checklist

This checklist helps keep Predixa’s experience sharp across devices. Run it prior to major releases or UI refreshes.

---

## 1. Lighthouse Audits

Run Lighthouse for both **Mobile** and **Desktop** profiles on these pages:

| Page | Target Scores (PWA optional) |
| --- | --- |
| `/` (Landing/Auth) | Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95 |
| `/daily` (Core dashboard) | Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 95 |
| `/account` (Billing & profile) | Performance ≥ 85, Accessibility ≥ 95 |

Steps:
1. Open Chrome → DevTools → Lighthouse.
2. Choose Mobile or Desktop, check “Simulated throttling.”
3. Run and export reports. Attach to release notes if scores drop.
4. Address repeated issues (e.g., large third-party scripts, low-contrast text, missing alt text).

---

## 2. Cross-Device Smoke Test

Validate layout and interactions on:
- iPhone 13/14 (Safari + Chrome)
- iPad or similar tablet (landscape + portrait)
- Android Pixel class device (Chrome)
- Desktop (Chrome, Edge/Safari if available)

Key flows:
- Sign up / Sign in / OAuth redirect
- Load `/daily` (ensure tier fallback message renders gracefully)
- Trigger Stripe checkout & portal from `/account`
- Sign out and verify redirection to `/`

---

## 3. Copy & Branding Pass

- Hero messaging updated (April 2025) to emphasize daily tiers + weekly outlook.
- Ensure logo is crisp at 1x/2x pixel densities (`/logo.jpg`).
- Check all CTAs for consistent tone (“Sign Up”, “Get Started”, etc.).
- Confirm support contact text promises 24–48 hour SLA (align with actual operations).

---

## 4. Onboarding Messaging

- Landing page hero: describes core value and highlights dashboard access + billing controls.
- Account page should show trial status and subscription CTA (already in place).
- Consider welcome email trigger (via Cognito or Stripe webhook) if not yet automated.

---

## 5. Known Follow-ups

- Public status/roadmap pages remain TODO; re-enable Support quick links when live.
- Consider adding in-app tooltips or a short introduction modal once feature set stabilizes.
- Keep this checklist updated after each UX improvement cycle.***

