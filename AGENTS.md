<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Rules for this site

See README.md for the full picture. The rules that break the page or sign-in
when ignored:

- **Never edit the vendored design system.** `public/sk/` and `content/` are
  written by `pnpm sync:design-system`. A design change goes into
  `sektar-design-elements/design-system`, then gets synced. Site-only styling
  belongs in the design system's `site.css`, not here.
- **The page markup is the prototype's.** `components/site-controller.tsx` binds
  to its `data-site-*` hooks. A renamed hook in `site.html` needs the same
  rename there, and the e2e suite catches a miss.
- **Sign-in is the SDK, in redirect mode.** Keep `adapters` undefined (never
  `[]`, which suppresses the redirect). Keep the Renown buttons disabled until
  `useRenown()` exists; before that, `login()` falls back to the default
  portal with no identity for the site.
- **On the return from Renown, wait for a definite answer:** a user, or status
  `not-authorized`. The SDK briefly reports no session while it checks.
- **Subpath imports only:** `@powerhousedao/reactor-browser/renown`, never the
  package root or `@powerhousedao/reactor` (ESLint enforces it).
- **`NEXT_PUBLIC_RENOWN_APP_NAME` is final.** It namespaces Renown's storage;
  changing it signs every visitor out.
- **Verify** with `pnpm typecheck`, `pnpm lint`, `pnpm build`,
  `pnpm check:bundle .next redirect` and `pnpm test:e2e`. On this kind of
  machine, install Playwright browsers with `PLAYWRIGHT_SKIP_BROWSER_GC=1`.
