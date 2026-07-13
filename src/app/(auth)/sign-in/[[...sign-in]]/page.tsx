import { SignIn } from "@clerk/nextjs";

/**
 * Sign-in page.
 *
 * Renders Clerk's pre-built <SignIn /> component, which handles:
 *   - Email + password login
 *   - OAuth (Google, GitHub, etc.) — configured in the Clerk dashboard
 *   - Magic link / OTP
 *   - MFA challenges
 *   - "Forgot password" flow
 *
 * The [[...sign-in]] catch-all segment is required by Clerk so it can
 * mount its own sub-routes (e.g. /sign-in/factor-one, /sign-in/sso-callback)
 * without us needing to create extra page files.
 *
 * After successful sign-in, Clerk redirects to `signInFallbackRedirectUrl`
 * set in ClerkProvider (/dashboard), or to whatever URL was in the
 * `redirect_url` query parameter if the user was bounced here from a
 * protected route.
 */
export default function SignInPage() {
  return <SignIn />;
}
