/**
 * Auth layout.
 *
 * Shared by /sign-in and /sign-up. Presents a minimal, centered surface
 * so the Clerk components are the visual focus. The JARVIS wordmark above
 * reinforces brand context without adding navigation clutter.
 *
 * Note: this layout does NOT wrap with ClerkProvider — that is already
 * done in the root layout (src/app/layout.tsx). Adding a second provider
 * here would cause a "nested ClerkProvider" error.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      {/* Brand mark */}
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] text-[var(--muted-foreground)] uppercase">
          AI Operating System
        </p>
        <h1 className="text-neon mt-1 text-3xl font-semibold">JARVIS</h1>
      </div>

      {/* Clerk sign-in / sign-up component renders here */}
      {children}
    </main>
  );
}
