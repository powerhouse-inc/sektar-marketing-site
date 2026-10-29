"use client";

import { GraphQLReactorProvider } from "@powerhousedao/reactor-browser/graphql-client";
import { RenownProvider } from "@powerhousedao/reactor-browser/renown";
import type { User } from "@renown/sdk";
import type { DocumentModelModule } from "document-model";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import {
  RENOWN_APP_NAME,
  RENOWN_CHAIN_ID,
  RENOWN_SWITCHBOARD_URL,
  RENOWN_URL,
  SWITCHBOARD_URL,
} from "@/lib/config";
import { rehydratedRenownToken } from "@/lib/reactor/token";
import { WALLET_ADAPTERS } from "@/lib/renown/wallet-adapters";

/* The document models this app writes with. Optional: without them the
   switchboard runs the reducer and actions are plain data. Register a model
   for its typed action creators and `useDocumentModelModuleById`, and because
   dispatching a batch of two or more actions needs the model to sign it.

   Import a package's `document-models` SUBPATH, never its root: the root also
   exports server-side processor code, which then lands in the browser bundle.

     import { TodoV1 } from "my-package/document-models";
*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DOCUMENT_MODELS: readonly DocumentModelModule<any>[] = [];

function RenownWithTheme({
  session,
  children,
}: {
  session: { user?: User } | null;
  children: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  return (
    <RenownProvider
      appName={RENOWN_APP_NAME}
      namespace={RENOWN_APP_NAME}
      url={RENOWN_URL}
      switchboardUrl={RENOWN_SWITCHBOARD_URL}
      chainId={RENOWN_CHAIN_ID}
      // undefined in redirect mode (see lib/renown/wallet-adapters.redirect).
      adapters={WALLET_ADAPTERS}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      // A server-verified session seeds the first render and turns on the
      // session-cookie sync (app/api/renown/session).
      session={session}
      onError={(error) => console.error("Renown initialization failed", error)}
    >
      {children}
    </RenownProvider>
  );
}

/**
 * The whole client-side integration:
 * - RenownProvider: sign-in (redirect or embedded), the session cookie.
 * - GraphQLReactorProvider: the light reactor client. `useDocument`,
 *   `useDispatch` and `useSwitchboardClient` below it talk GraphQL to the data
 *   switchboard, with no reactor or PGlite in the bundle. Its token provider
 *   waits for a persisted Renown session rather than sending requests
 *   anonymously while the session loads.
 */
export function Providers({
  session,
  children,
}: {
  session: { user?: User } | null;
  children: ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <RenownWithTheme session={session}>
        <GraphQLReactorProvider
          url={SWITCHBOARD_URL}
          tokenProvider={rehydratedRenownToken}
          documentModels={DOCUMENT_MODELS}
        >
          {children}
          <Toaster richColors />
        </GraphQLReactorProvider>
      </RenownWithTheme>
    </ThemeProvider>
  );
}
