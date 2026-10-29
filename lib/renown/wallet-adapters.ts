import type { WalletAdapterDescriptor } from "@renown/sdk/wallet";
import { mockAdapter } from "@renown/sdk/wallet/mock";
import { privyAdapter } from "@renown/sdk/wallet/privy";
import { rainbowAdapter } from "@renown/sdk/wallet/rainbow";
import { RENOWN_APP_NAME, RENOWN_CHAIN_ID } from "@/lib/config";

/* Wallet adapters for embedded (in-page) sign-in. Only embedded builds import
   this module: next.config.ts aliases it to ./wallet-adapters.redirect in
   redirect mode. Importing an adapter makes its peer dependencies a build
   requirement; the wallet library itself still loads lazily, on the first
   login click. */

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

/* NEXT_PUBLIC_RENOWN_MOCK=1 swaps in the headless mock signer for local dev and
   e2e. It signs with a well-known key, so never ship it: a production build
   with it set fails in next.config.ts. */
const MOCK = process.env.NEXT_PUBLIC_RENOWN_MOCK === "1";

/** Module scope on purpose: RenownWalletProvider snapshots the array on mount,
 * so one rebuilt per render would pin the first render's value. */
export const WALLET_ADAPTERS: WalletAdapterDescriptor[] | undefined = MOCK
  ? [mockAdapter({ methods: ["wallet", "email"], chainId: RENOWN_CHAIN_ID })]
  : [
      rainbowAdapter({
        ssr: true,
        appName: RENOWN_APP_NAME,
        // Both optional: without the WalletConnect id only an installed
        // wallet can sign in; without Infura each chain uses its public RPC.
        walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        infuraProjectId: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID,
      }),
      // Privy has no degraded mode: without an app id it is left out.
      ...(PRIVY_APP_ID
        ? [
            privyAdapter({
              appId: PRIVY_APP_ID,
              clientId: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined,
              methods: ["google", "email"],
            }),
          ]
        : []),
    ];
