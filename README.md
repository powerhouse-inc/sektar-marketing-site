# Fusion boilerplate

A starter for Powerhouse web apps ("fusion apps"): a Next.js app that signs
users in with **Renown** and reads and writes **documents** on a Powerhouse
switchboard. It uses the **light reactor client**: plain GraphQL, with no
reactor, PGlite or job queue in the browser bundle.

Built on the Powerhouse **6.2.3** train (`@powerhousedao/reactor-browser`,
`@renown/sdk`, `document-model`, `@powerhousedao/ph-cli`), pinned exactly in
`package.json`. Bump them together.

The reference implementation lives in the Powerhouse monorepo at
`test/test-fusion`, where the same integration runs in CI against the latest
platform code.

## Quick start

Requires Node 24+ and pnpm 10.

```bash
pnpm install
cp .env.example .env.local     # the defaults work locally
pnpm switchboard               # a local 6.2.3 switchboard on :4001 (own terminal)
pnpm dev                       # the app on :3000
```

The local switchboard stores its data in `switchboard/.ph/` and serves the
Renown package, so it can stand in for Renown's switchboard too.

| Script             | What it does                                                       |
| ------------------ | ------------------------------------------------------------------ |
| `pnpm dev`         | Next dev server                                                    |
| `pnpm switchboard` | Local switchboard on :4001 (`switchboard/powerhouse.config.json`)  |
| `pnpm build`       | Production build                                                   |
| `pnpm typecheck`   | `tsc --noEmit`                                                     |
| `pnpm lint`        | ESLint, including the import rules below                           |
| `pnpm codegen`     | Typed SDKs for custom subgraphs (see [Custom subgraphs](#custom-subgraphs)) |
| `pnpm test:e2e`    | Playwright: its own switchboard and dev servers, both login modes  |

## Three URLs

| Variable                             | What it is                                                                         | Default                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SWITCHBOARD_URL`        | **Your data switchboard**, where your documents live (`<base>/graphql`)           | `http://localhost:4001/graphql`               |
| `NEXT_PUBLIC_RENOWN_URL`             | The **Renown portal** a redirect sign-in goes to                                   | `https://www.renown.id`                       |
| `NEXT_PUBLIC_RENOWN_SWITCHBOARD_URL` | **Renown's switchboard**: issues, serves and verifies sign-in credentials          | `https://switchboard.renown.vetra.io/graphql` |

Keep the last two apart from the first. Renown's switchboard is not where your
app's documents live. All variables are listed in `.env.example`; every
`NEXT_PUBLIC_*` value is inlined at build time.

## Signing in: redirect or embedded

`NEXT_PUBLIC_RENOWN_LOGIN_MODE` picks one per build:

- **`redirect`** (default): the user goes to the Renown portal and comes back
  with `?user=<did>`. It needs no wallet configuration, and next.config.ts swaps
  the wallet adapters for a stub, so the client bundle carries no wallet
  library (about 1.6 MB of static assets against 15 MB embedded).
- **`embedded`**: sign-in happens in-page with the adapters in
  `lib/renown/wallet-adapters.ts`: Rainbow (browser wallets) and, with
  `NEXT_PUBLIC_PRIVY_APP_ID`, Privy (email, Google). `NEXT_PUBLIC_RENOWN_MOCK=1`
  swaps in a headless mock signer for local work and e2e. It signs with a
  well-known key, and a production build with it set fails.

Either way, `RenownProvider` (in `app/providers.tsx`) keeps an HttpOnly session
cookie in sync through `app/api/renown/session`. The cookie is what `proxy.ts`
checks to gate the app, and what `verifySession()` in `lib/dal.ts` verifies in
server components and route handlers.

Rules the code already follows:

- In redirect mode pass `adapters: undefined`, never `[]`. An empty array still
  registers the in-page login and suppresses the redirect.
- Start a redirect sign-in from a public page (`/login`). The portal returns to
  the page that left. `proxy.ts` keeps `?user=` when it redirects to `/login`,
  and `?next=` brings the user back to where they were going.
- After sign-in, navigate once `useRenownSessionSynced()` is true, or the proxy
  sees no cookie yet and sends the user back to `/login`.

## Documents

Under `GraphQLReactorProvider` the same hooks Connect uses work against the
data switchboard:

```tsx
import {
  useDispatch,
  useDocumentSafe,
  useSwitchboardClient,
} from "@powerhousedao/reactor-browser/graphql-client";
import { setName } from "document-model";

const doc = useDocumentSafe(id); // { status, data, error }; stays in sync live
const [, dispatch] = useDispatch(doc.data);
dispatch(setName("New name")); // signed by the Renown user when signed in
```

- **Reads**: `useDocumentSafe(id)` (non-suspending) or `useDocument(id)`
  (Suspense). Lists the hooks don't cover go through `client.request(query)` on
  the reactor's own `/graphql`, e.g. `findDocuments` in
  `lib/reactor/use-drives.ts`. In 6.2.3 the client has no `find` of its own.
- **Writes**: `useDispatch` or `client.execute`. Writes go to the switchboard
  first; there is no optimistic or offline state.
- **Realtime**: the hooks update themselves; for your own lists,
  `useDocumentChanges(types, onChange)` in `lib/reactor/use-document-changes.ts`.
- **Client-only**: the client exists in the browser only, so views that read
  documents render inside `<ClientOnly>`. Some 6.2.3 hooks cannot run during
  server rendering. Use `verifySession()` for server-side auth, and the
  switchboard's GraphQL directly if you need server-side data.
- **Document models**: optional. Without them the switchboard runs the reducer
  and actions are plain data (`setName` above is a base action every model
  accepts). Register your models in `DOCUMENT_MODELS` in `app/providers.tsx` to
  get typed action creators and `useDocumentModelModuleById`. A batch of two or
  more actions needs its model, or the client refuses to sign it. Import a
  package's **`document-models` subpath**, never its root, which also carries
  server-side processor code.

## Custom subgraphs

Your package's subgraphs are served next to the reactor at
`<base>/graphql/<name>`. To call one with types:

1. Add its name to `SUBGRAPHS` in `codegen.ts`, and its operations to
   `lib/graphql/documents/<name>.graphql`.
2. With the switchboard running, `pnpm codegen` (it introspects
   `PH_SWITCHBOARD_URL`) writes `lib/graphql/gen/<name>.ts`. Commit it.
3. `useSubgraphSdk("<name>", getSdk)` from `lib/graphql/subgraph.ts` binds it to
   the light client, which derives the URL and adds the bearer token.

## Switchboard requirements

- The same train as the client (6.2.3). An older switchboard fails on fields
  the client asks for.
- Leave `AUTH_ENABLED` **unset**. It selects an admin-only policy that refuses
  every non-admin user.
- For reads that depend on who is signed in, run with
  `RESOLVE_CALLER_IDENTITY=true`, and use document policies to decide access.

## Bundling rules

`pnpm lint` enforces them:

- Import `@powerhousedao/reactor-browser/graphql-client` and `/renown`, never
  the package root. The root reaches the reactor (`pg`, PGlite,
  `node:worker_threads`), and Turbopack fails on it.
- Never import `@powerhousedao/reactor` in app code.

The embedded build stubs `@x402/*` (optional Coinbase packages reached through
the wallet libraries; see `next.config.ts`).

## Tests

`pnpm test:e2e` starts its own switchboard (`e2e/switchboard`, port 4801) and a
dev server per login mode (3120 redirect, 3121 embedded), separate from your dev
stack. The redirect specs replace the Renown portal with a fake origin that
signs and stores a real delegation credential (`e2e/support`).
Run `pnpm exec playwright install chromium` once first.

## Not here yet

Profile editing through the user's Renown profile document. It waits on
platform work that gives profile documents an owner and a reconciled set of
official values.
