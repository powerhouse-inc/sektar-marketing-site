import type { NextConfig } from "next";

/* The mock signer signs with a well-known key: never in a production build. */
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_RENOWN_MOCK === "1" &&
  process.env.NEXT_PUBLIC_RENOWN_MOCK_UNSAFE_PRODUCTION_BUILD !== "1"
) {
  throw new Error(
    "NEXT_PUBLIC_RENOWN_MOCK=1 is set for a production build. The mock signer " +
      "signs with a well-known key. Unset it, or for an e2e run against " +
      "`next start` also set NEXT_PUBLIC_RENOWN_MOCK_UNSAFE_PRODUCTION_BUILD=1.",
  );
}

/* Redirect sign-in needs no wallet library: swap the adapters module for a stub
   so a redirect build neither bundles nor resolves the adapters' packages. */
const redirectMode = process.env.NEXT_PUBLIC_RENOWN_LOGIN_MODE !== "embedded";

/* Embedded mode bundles the wallet adapters. `@x402/*` are optional peers of
   `@coinbase/cdp-sdk` (reached through @renown/sdk → rainbowkit → wagmi), used
   only for Coinbase's x402 micropayments, which this app never invokes.
   cdp-sdk imports them lazily behind runtime guards, but Turbopack resolves
   dynamic imports at build time and fails the build, so they are stubbed. */
const X402_STUB = "./lib/stubs/empty-module.js";
const x402Stubs = Object.fromEntries(
  [
    "@x402/core",
    "@x402/core/client",
    "@x402/evm",
    "@x402/evm/exact/client",
    "@x402/evm/upto/client",
    "@x402/svm",
    "@x402/svm/exact/client",
    "@x402/extensions",
  ].map((name) => [name, X402_STUB]),
);

const nextConfig: NextConfig = {
  // Lets a second dev server (the embedded-mode e2e) run beside the default one.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: {
    resolveAlias: redirectMode
      ? {
          "@/lib/renown/wallet-adapters":
            "./lib/renown/wallet-adapters.redirect.ts",
        }
      : x402Stubs,
  },
};

export default nextConfig;
