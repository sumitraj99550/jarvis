import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

/**
 * Root layout — wraps the entire application with ClerkProvider.
 *
 * ClerkProvider must be the outermost wrapper so that every page,
 * layout, and Server Component below it can call Clerk's auth helpers
 * (auth(), currentUser(), etc.) without additional setup.
 *
 * Clerk reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from the environment
 * automatically; the explicit prop values below set the canonical URLs
 * for sign-in and sign-up so Clerk's redirect logic stays consistent
 * even if the env vars aren't set yet.
 */
export const metadata: Metadata = {
  title: "JARVIS | AI Operating System",
  description:
    "Personal AI Operating System — command center, voice assistant, and business intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" className="h-full antialiased">
        <body className="flex min-h-full flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
