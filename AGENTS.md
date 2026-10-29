<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Powerhouse rules for this app

See README.md for the full picture. The rules that break builds or sign-in
when ignored:

- **Subpath imports only.** `@powerhousedao/reactor-browser/graphql-client` and
  `@powerhousedao/reactor-browser/renown`, never the package root (it pulls the
  reactor, pg and PGlite into the browser bundle). Never `@powerhousedao/reactor`.
  Document models come from a package's `document-models` subpath. ESLint
  enforces the first two.
- **Redirect mode is `adapters: undefined`, never `[]`.** next.config.ts aliases
  `@/lib/renown/wallet-adapters` to `wallet-adapters.redirect.ts` in redirect
  mode; keep both files exporting `WALLET_ADAPTERS`.
- **Three URLs.** Data switchboard (`SWITCHBOARD_URL`), Renown portal
  (`RENOWN_URL`), Renown's switchboard (`RENOWN_SWITCHBOARD_URL`), all in
  `lib/config.ts`. Do not point Renown at the data switchboard or vice versa,
  except locally where one switchboard plays both.
- **Document reads are client-only.** Render views that use `useDocument*`,
  `useSwitchboardClient` or `useDrives` inside `<ClientOnly>`. In 6.2.3 some of
  these hooks fail during server rendering, and the page answers 500.
- **6.2.3 client surface:** `get`, `getOperations`, `create`, `execute`,
  `deleteDocument`, `subscribe`, `subgraph`, `request`. There is no `find` and
  no `read.drives`; list documents with `client.request` and `findDocuments`.
- **Server-side auth** goes through `verifySession()` (`lib/dal.ts`); `proxy.ts`
  is a fast gate, not the authoritative check.
- **`NEXT_PUBLIC_RENOWN_APP_NAME`** is also Renown's storage namespace;
  `lib/reactor/token.ts` reads the persisted user under it. Change both or
  neither.
- **Verify** with `pnpm typecheck`, `pnpm lint` and `pnpm test:e2e` (it brings
  its own switchboard). After changing next.config.ts or the login mode,
  `pnpm build` both modes:
  `NEXT_PUBLIC_RENOWN_LOGIN_MODE=embedded pnpm build`.
