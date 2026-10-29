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

/* Where a Sektar cloud environment lives, from its name: `{name}` is replaced.
   Open question: connect.<env>.vetra.io (the Vetra Cloud docs) or
   <name>.sektar.app (the delivery study). */
export const CLOUD_URL_TEMPLATE =
  process.env.NEXT_PUBLIC_CLOUD_URL_TEMPLATE ?? "https://connect.{name}.vetra.io/";

/* A directory that lists a person's environments
   (`GET {url}/v1/environments?owner=did:pkh:…`). Not built yet: unset means
   the dialog offers remembered and typed addresses only. */
export const DIRECTORY_URL = process.env.NEXT_PUBLIC_DIRECTORY_URL || null;
