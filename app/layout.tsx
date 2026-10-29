import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { verifySession } from "@/lib/dal";
import { SITE_URL } from "@/lib/config";
import { loadSiteMeta } from "@/lib/site-html";
import { Providers } from "./providers";

/* Inter, self-hosted at build time (no request to Google from the visitor's
   browser), under the family name the design system's tokens use. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// The prototype's own <title> and description (scripts/sync-design-system.mjs).
const { title, description } = loadSiteMeta();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  icons: { icon: { url: "/sk/assets/favicon.svg", type: "image/svg+xml" } },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Sektar",
    title,
    description,
    images: [{ url: "/sk/assets/photos/laptop-workspace-with-coffee.jpg" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F7F3" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1411" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A valid session cookie renders the signed-in header straight away.
  const session = await verifySession();
  return (
    // No data-theme: the design system follows the OS (light / dark).
    <html lang="en" className={inter.variable}>
      <head>
        {/* The design system, vendored unmodified (scripts/sync-design-system.mjs)
            and served as files, so its @imports and relative font URLs work as
            they do in the design system itself. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/sk/css/sektar.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/sk/css/doc-browser.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/sk/css/site.css" />
        <style>{`:root { --sk-font-sans: var(--font-inter), "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }`}</style>
      </head>
      <body className={session ? "site-body is-signed-in" : "site-body"}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
