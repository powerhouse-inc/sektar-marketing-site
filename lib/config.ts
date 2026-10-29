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
  process.env.NEXT_PUBLIC_RENOWN_APP_NAME ?? "fusion-app";

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
   Not the data switchboard below. */
export const RENOWN_SWITCHBOARD_URL =
  process.env.NEXT_PUBLIC_RENOWN_SWITCHBOARD_URL ??
  "https://switchboard.renown.vetra.io/graphql";

/* The switchboard the app's documents live on (`<base>/graphql`). Custom
   subgraphs are served next to it at `<base>/graphql/<name>`. */
export const SWITCHBOARD_URL =
  process.env.NEXT_PUBLIC_SWITCHBOARD_URL ?? "http://localhost:4001/graphql";
