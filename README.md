# Sektar marketing site

The public site for **Sektar** at <https://sektar.io>. It is the Sektar design
system's site prototype (`sektar-design-elements/design-system/site.html`),
served by Next.js:

- **The page** is the prototype's markup, rendered verbatim. Its sections are
  cut out by a sync script, so a design change needs no hand-ported markup.
- **Sign-in** is Renown, through the Powerhouse SDK (redirect mode).
- **"Open your Sektar"** forwards the signed-in person to their own Sektar: a
  home computer through Portle, or a Sektar cloud environment.

Started from the fusion template (`powerhouse-inc/fusion-boilerplate`), cut
down to what a public site needs. The site reads no documents.

## Quick start

Requires Node 24+ and pnpm 10.

```bash
pnpm install
cp .env.example .env.local     # defaults are production (renown.id, sektar.io)
pnpm dev                       # http://localhost:3000
```

Sign-in in development goes to the real Renown portal, which returns to
localhost.

| Script                    | What it does                                                         |
| ------------------------- | -------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js                                                 |
| `pnpm sync:design-system` | Re-vendor the design system (see below)                               |
| `pnpm typecheck`, `pnpm lint` | Checks; lint also forbids importing the reactor                   |
| `pnpm check:bundle .next redirect` | After a build: no reactor, PGlite or wallet library in the client bundle |
| `pnpm test:e2e`           | Playwright, with its own switchboard and a fake Renown portal (run `PLAYWRIGHT_SKIP_BROWSER_GC=1 pnpm exec playwright install chromium` once) |

## The design system

`pnpm sync:design-system [path/to/design-system]` (default
`../sektar-design-elements/design-system`) copies, unmodified:

- the shipped CSS layers and `site.css` to `public/sk/css/`. They are served as
  files, so their `@import`s and font URLs work as in the design system.
- the assets the page and the CSS refer to, to `public/sk/assets/`.
- `site.html` to `content/site.html`, plus the parts the page renders:
  - `content/sections/*.html`: the preamble (skip link and sprites), header,
    main, footer and the sign-in dialog, with asset paths pointed at `/sk`;
  - `content/sections/meta.json`: the `<title>` and meta description.
- `public/sk/css/doc-browser.css`: the hero's browser-frame rules, extracted
  from the documentation-only `docs.css`.
- `public/sk/VERSION.json`: the source commit, whether it had uncommitted
  changes, and a hash per file.

It leaves out the prototype bar, the prototype notes, `docs.css` and
`js/site.js`. It fails, so a broken page never ships, when a section, the
sprites or the title is missing, or when the page refers to an asset the
design system doesn't have.

Review the diff and commit it. `VERSION.json` tells you which design system the
site shipped.

## Sign-in and forwarding

`components/site-controller.tsx` gives the verbatim markup its behaviour, on the
prototype's `data-site-*` hooks, steps and copy. It differs from `js/site.js`
only in the sign-in:

- **Sign-in goes through the Renown SDK.** `RenownProvider` in redirect mode
  holds the site's key, goes to the portal, checks the credential it brings
  back and keeps the session. The prototype's own key, its REST calls to
  renown.id and viem from a CDN are gone.
- **The return lands on `/` with `?user=`.** The dialog reopens at "Where does
  your Sektar run?". A `?env=<url>` link survives the round trip and opens that
  environment straight away.
- **Forwarding is a port of the prototype** (`lib/environments.ts`): typed
  addresses, environments remembered per Renown user on the device, an optional
  directory, and a reachability check before navigating.
- **A session cookie** (`app/api/renown/session`) lets the server render the
  signed-in header on the first paint (`lib/dal.ts`).

## Open questions (configuration, not code)

| Question | Setting | Today |
|---|---|---|
| Cloud URL pattern | `NEXT_PUBLIC_CLOUD_URL_TEMPLATE` | `https://connect.{name}.vetra.io/` (Vetra Cloud docs); the delivery study proposes `{name}.sektar.app` |
| Directory of a person's environments | `NEXT_PUBLIC_DIRECTORY_URL` | unset: remembered and typed addresses only |
| Reachability of cloud environments | `answers()` in `lib/environments.ts` | any HTTP answer counts, so a load balancer's 502 reads as "up"; right for Portle |

## Deploying

The page renders per request (it reads the session cookie), so the site needs a
Node server, not static hosting. Robots and the sitemap are static.

### Docker

```bash
docker build -t sektar-marketing-site .
docker run --rm -p 3000:3000 sektar-marketing-site
```

- The image is Next.js standalone output on `node:24-slim`, about 390 MB. It
  runs as the `node` user and includes a health check on `/robots.txt`.
- `NEXT_PUBLIC_*` settings are inlined at build time, so pass them as
  `--build-arg` (e.g. `--build-arg NEXT_PUBLIC_CLOUD_URL_TEMPLATE=https://{name}.sektar.app/`),
  not at `docker run`. The defaults are production.
- The build runs the bundle check and fails if reactor, PGlite or wallet code
  reaches the client.
- The server listens on `PORT` (default 3000).

### Without Docker

`pnpm build && pnpm start`. The server needs `content/` and `public/` next to it
at runtime, because the page reads its sections from `content/sections/`.
