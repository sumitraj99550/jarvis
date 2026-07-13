import { SignUp } from "@clerk/nextjs";

/**
 * Sign-up page.
 *
 * Renders Clerk's pre-built <SignUp /> component, which handles:
 *   - Email + password registration
 *   - OAuth registration
 *   - Email verification
 *   - Username / profile completion
 *
 * After registration, Clerk fires a `user.created` webhook to
 * /api/webhooks/clerk, which creates the user row in our database and
 * assigns the appropriate role (ADMIN for the very first user, VIEWER
 * for all subsequent users).
 */
export default function SignUpPage() {
  return <SignUp />;
}
