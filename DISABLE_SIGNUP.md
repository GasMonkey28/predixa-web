# Disable New-User Registration

Set this env var to turn off new-account sign-ups (e.g. on the test deployment
while it's closed for testing):

```bash
NEXT_PUBLIC_DISABLE_SIGNUP=true
```

- **Local:** already added to `.env.local`. Restart `npm run dev` after changing it
  (`NEXT_PUBLIC_*` vars are inlined at server start).
- **Test / prod deployment:** add the same var in the hosting provider's
  environment settings and redeploy.

## What it blocks when `true`

- The signup screen (`SignupForm`) shows a "Registration Closed" message instead
  of the form.
- Home page hides the "Start Your Free Trial" CTA and the "Sign up" link under the
  login form.
- `authStore.signUp()` throws `Registration is currently disabled.` (defense in
  depth) and the signup screen's Google/Apple buttons refuse.

## What it does NOT block

- Existing users signing in (email, Google, Apple) — intentional.
- Federated (Google/Apple) *sign-in* from the login screen. Because Cognito
  auto-provisions a user on first federated login, a brand-new Google/Apple user
  could still create an account via **Sign In**. For an airtight lock, also set the
  Cognito User Pool to admin-create-only or remove the hosted-UI sign-up:

  ```bash
  aws cognito-idp update-user-pool \
    --user-pool-id <POOL_ID> \
    --admin-create-user-config AllowAdminCreateUserOnly=true
  ```

Unset the var (or set it to `false`) to re-open registration.
