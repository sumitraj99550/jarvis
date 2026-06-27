import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout for the entire JARVIS dashboard.
 *
 * Note on fonts: we deliberately use system font stacks (defined via the
 * `--font-geist-sans` / `--font-geist-mono` CSS variable fallbacks in
 * globals.css) instead of `next/font/google`. This avoids a build-time
 * network dependency on Google Fonts, which keeps local dev, CI, and
 * Docker builds fast and reliable in locked-down network environments.
 * If a custom typeface is required later, prefer self-hosted font files
 * via `next/font/local` over `next/font/google`.
 */
export const metadata: Metadata = {
  title: "JARVIS | AI Operating System",
  description:
    "Personal AI Operating System dashboard — command center, voice assistant, and business intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
