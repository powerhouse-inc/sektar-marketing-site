import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { verifySession } from "@/lib/dal";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fusion Platform",
  description: "A Powerhouse web app: Renown sign-in and the light reactor client",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The verified session seeds the client, so the first render (server and
  // hydration) is already signed in when the cookie is valid.
  const session = await verifySession();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mx-4 sm:mx-16`}
      >
        <Providers session={session}>
          <header className="my-8 flex items-center justify-between gap-4">
            <Link href="/">
              <Image
                src="/fusion-logo.svg"
                alt="Fusion logo"
                width={207 * 0.75}
                height={48 * 0.75}
                priority
              />
            </Link>
            <UserMenu />
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
