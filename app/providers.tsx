"use client";

import { RenownProvider } from "@powerhousedao/reactor-browser/renown";
import type { User } from "@renown/sdk";
import type { ReactNode } from "react";
import {
  RENOWN_APP_NAME,
  RENOWN_CHAIN_ID,
  RENOWN_SWITCHBOARD_URL,
  RENOWN_URL,
} from "@/lib/config";
import { WALLET_ADAPTERS } from "@/lib/renown/wallet-adapters";

/**
 * Renown sign-in for the site. Redirect mode: "Continue with Renown" goes to
 * the Renown portal and comes back with `?user=`, which this provider consumes.
 * The site reads no documents, so there is no reactor client here.
 *
 * A server-verified session (lib/dal.ts) seeds the first render and turns on
 * the session-cookie sync (app/api/renown/session).
 */
export function Providers({
  session,
  children,
}: {
  session: { user?: User } | null;
  children: ReactNode;
}) {
  return (
    <RenownProvider
      appName={RENOWN_APP_NAME}
      namespace={RENOWN_APP_NAME}
      url={RENOWN_URL}
      switchboardUrl={RENOWN_SWITCHBOARD_URL}
      chainId={RENOWN_CHAIN_ID}
      // undefined in redirect mode (see lib/renown/wallet-adapters.redirect).
      adapters={WALLET_ADAPTERS}
      session={session}
      onError={(error) => console.error("Renown initialization failed", error)}
    >
      {children}
    </RenownProvider>
  );
}
