/* Client runtime config. `NEXT_PUBLIC_*` values are inlined at build time.
   Adapter-free on purpose, so server modules (dal.ts, proxy.ts) can read it;
   the wallet adapters live in ./renown/wallet-adapters. */

export type RenownLoginMode = "embedded" | "redirect";

/* "redirect" sends the user to the Renown portal and back; "embedded" signs in
   in-page with the wallet adapters. next.config.ts swaps the adapters module
   for a stub in redirect mode, so a redirect build carries no wallet library. */
export const RENOWN_LOGIN_MODE: RenownLoginMode =
  process.env.NEXT_PUBLIC_RENOWN_LOGIN_MODE === "embedded"
    ? "embedded"
    : "redirect";

/* The app's Renown name. It also namespaces Renown's localStorage keys, so
   changing it signs every user out. */
export const RENOWN_APP_NAME =
  process.env.NEXT_PUBLIC_RENOWN_APP_NAME ?? "sektar-site";

/* Chain the credentials are issued on. It is part of the user's DID
   (`did:pkh:eip155:<chainId>:<address>`), so keep the wallet adapters on it. */
export const RENOWN_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_RENOWN_CHAIN_ID ?? "1",
);

/* The Renown portal a redirect sign-in goes to and comes back from. */
export const RENOWN_URL =
  process.env.NEXT_PUBLIC_RENOWN_URL ?? "https://www.renown.id";

/* Renown's own switchboard: issues credentials on an embedded sign-in, serves
   them for a redirect sign-in, and verifies sessions server-side (dal.ts).
   Sektar itself runs elsewhere
   (see the environment templates below); this site reads no documents. */
export const RENOWN_SWITCHBOARD_URL =
  process.env.NEXT_PUBLIC_RENOWN_SWITCHBOARD_URL ??
  "https://switchboard.renown.vetra.io/graphql";

/* ---------------------------------------------------------------- the site */

/* The public origin, for metadata, robots and the sitemap. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sektar.io";

/* Where a home computer is published through Portle, from its zone:
   `{zone}` is replaced, e.g. marit.studio -> https://app.marit.studio/. */
export const PORTLE_URL_TEMPLATE =
  process.env.NEXT_PUBLIC_PORTLE_URL_TEMPLATE ?? "https://app.{zone}/";

/* Where a Sektar cloud environment typed by name lives: `{name}` is its Vetra
   subdomain. A Sektar host is the environment's only service, so Vetra serves
   it at the apex. The directory (below) spares most people the typing. */
export const CLOUD_URL_TEMPLATE =
  process.env.NEXT_PUBLIC_CLOUD_URL_TEMPLATE ?? "https://{name}.vetra.io/";

/* The directory that lists the signed-in person's Sektar environments:
   Vetra's (`GET {url}/v1/environments?app=<id>`, with the Renown bearer).
   Empty means the dialog offers remembered and typed addresses only. */
export const DIRECTORY_URL = process.env.NEXT_PUBLIC_DIRECTORY_URL || null;

/* "Free": Sektar in the browser, documents kept in the visitor's own browser. */
export const FREE_URL =
  process.env.NEXT_PUBLIC_FREE_URL ?? "https://calm-bat-b4qzzqbb-connect.vetra.io/";

/* "On your own computer": the desktop app's installers, from the latest release. */
export const DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DOWNLOAD_URL ?? "https://github.com/powerhouse-inc/sektar/releases/latest";

/* Vetra's GraphQL endpoint: an invite code is redeemed there for a cloud Sektar. */
export const VETRA_GRAPHQL_URL =
  process.env.NEXT_PUBLIC_VETRA_GRAPHQL_URL ?? "https://switchboard.vetra.io/graphql";

/* Sektar's App on Vetra: the directory lists environments that run it. */
export const DIRECTORY_APP =
  process.env.NEXT_PUBLIC_DIRECTORY_APP ?? "43622402-be06-435a-bbfa-bb649b0d6244";
