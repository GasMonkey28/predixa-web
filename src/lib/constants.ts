export const SESSION_COOKIE_NAME = 'predixa_session'

/** Default route for authenticated users with access */
export const POST_LOGIN_PATH = '/summary'

/**
 * When true, new-account registration is turned off (email sign-up and the
 * signup screen's social buttons). Existing users can still sign in.
 * Set NEXT_PUBLIC_DISABLE_SIGNUP=true in the environment to enable — used on
 * the test deployment while it's closed for testing.
 */
export const SIGNUP_DISABLED = process.env.NEXT_PUBLIC_DISABLE_SIGNUP === 'true'

