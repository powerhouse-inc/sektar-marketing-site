# Where the product and the docs disagree

The working list for the practice in [README.md](README.md). This file isn't
published. Remove a row when the gap is closed.

Checked 2026-10-31 by reading the code and the published release. Nothing here
was run, except where a row says so.

## Sign-in and identity

Decided by Wouter on 2026-10-31 and built for the Desktop App. The rules are on
the page now, under Signing in, Where your documents are and Settings. What was
run is in `sektar/qa/desktop/acceptance.mjs`, which tests that section of the
page against the real app.

These rules are still to come for Self-hosted Sektar:

- **Self-hosted Sektar:** the same rules as the Desktop App.
- **Advanced, Desktop App and Self-hosted:** possibly enable the Renown module in
  their own switchboard, or self-host a dedicated Renown instance.
- **Sektar Cloud:** you sign in with an official Renown identity, which maps to
  your own instance and its storage.

| Gap | Today | Where |
| --- | --- | --- |
| Not released | The work is on local `main` of `powerhouse` and `ph-desktop-shell`, and `sektar` `main` needs a monorepo release and a shell release before it builds again. Until then the download is the old app, so the page describes something nobody can download | Release order: monorepo, shell crate, bump both in `sektar`, run the desktop workflow |
| macOS and Linux | Built and run on Windows only | `ph-desktop-shell`, once released, through `desktop.yml` |
| A real Renown sign-in | The acceptance tests use a stand-in that signs real credentials. The official Renown hasn't been tried with a real wallet | Wouter, on the installed app |
| Self-hosted storage | Documents are in Postgres, with the rest on `/data`, so there's no single path to split by identity | To decide: a database or schema per identity, or one identity per deployment |
| Add-on registry | Stays on `registry.dev.vetra.io` on purpose until the production registry (UAT) is updated: decided by Wouter on 2026-10-31. It's the one dev value in a production build. `registryUrl` in `settings.json` overrides it, which is passed on but not tested end to end | `sektar/powerhouse.config.json` |
| Automations reaching this computer | `PH_WORKFLOWS_EGRESS_ALLOW_ADDRESSES` isn't set, so an automation can't reach a private address such as a local model server. `settings.json` has no key for it | `ph-desktop-shell` |
| Concurrency defaults | `concurrency.workflowRuns` passes through when set. Left out, the stack's default applies, which doesn't follow the machine | `ph-desktop-shell` |
| Admins' operational views | `INSPECTION_ADMIN_ENABLED` is on for the `cli` host and in the checkout's `.env`, and on nothing for the Desktop App, whose admins don't get them | Decide, then `hosts/desktop` or the shell |
| Slow to start | 22 s from sign-in to the window, 26 s for the first start after installing, on a computer doing nothing else. With a build running it reached 122 s, all of it before the app logs anything, and the window says nothing meanwhile. About 12 s is the two databases opening one after the other, 7 s the GraphQL APIs | `apps/switchboard`, the loading page |
| Uninstalling leaves files behind | About 11,000 of the stack's 131,000 files stay in the install folder. Keys and the Google client are removed, and the user's data is kept on purpose. Installing over them works | NSIS, `ph-desktop-shell` |
| Nothing starts a packaged app in CI | `desktop.yml` builds the installer and checks the file exists. A package that dies at launch passes. `qa/desktop` does this on Windows, by hand | `sektar/.github/workflows/desktop.yml` |
| The stack is a hand-written list | What a packaged app holds is what `bundle-stack.ts` names, so anything added to the project has to be added there too, and nothing says so when it isn't. Today that lost a plugin, the Google client and the project's own version and exports | `packages/desktop/src/bundle-stack.ts` |
| A missing piece runs something else | A workflow pinned to a piece that isn't there runs whatever the registry has, and reports success | `packages/reactor-workflow` |
| Telemetry leaving the computer | Proven by what the stack is started with, and by no files being written. Nobody has captured the outbound traffic | `sektar/qa/desktop/acceptance.mjs` |
| Renown in your own switchboard | The site's e2e switchboard already runs `@powerhousedao/renown-package`, so the module exists. Sektar's hosts don't offer it | `hosts/switchboard/host.js` |

## The home page promises what doesn't exist

The home page's copy is in `sektar-design-elements/design-system/site.html`.

| The site says | Today | To decide |
| --- | --- | --- |
| "Your computer, reachable anywhere", "We add access from anywhere" | Portle can't publish the Desktop App. The app starts with an admin now, but Sektar has no screen for Portle, the app doesn't include its tools (`frpc`, Caddy), and the package is marked experimental. Portle's gate hasn't been tried against the new sign-in | Mark it as coming, or change the copy until it works |
| "Encrypted copies go to the cloud every day", "your last backup is in the cloud" | No backup code in Sektar, or in the Portle and desktop packages | Change the copy until it exists. The sign-in page's "isn't answering" step says it too |
| "Offline on your laptop, synced to your phone" | No phone app, and no sync between Sektars | Change the copy |
| "Move home whenever you like", "Take it with you anytime" | No way to move a Sektar between the three in Sektar's own code | Build it, or change the copy |
| Three ways to start: Free, On your own computer, In the cloud | The docs' three are Desktop App, Cloud and Self-hosted. Self-hosted isn't on the home page, and the Desktop App appears under both Free and On your own computer | Pick one set of names. The sign-in page also says "My computer" and "Sektar cloud" |

## Sektar Cloud

| Gap | Today | Where |
| --- | --- | --- |
| Connected accounts don't finish on a new environment | No reactor connection is created, and a run can't read the key index. Issues 2 and 4 in `cloud-userflow/issues-2026-10-30.md`, seen on a real environment | The fix is on `feat/delegated-grant`, not released |
| Google sign-in is limited to test users | The Google app is in testing, seen on 2026-10-30. Gmail read access may need more than verification | Google verification, separate track |
| Backups are undefined | Nothing in these repositories says what a cloud environment's backup is | Vetra, then the page |

## Sektar Desktop App

| Gap | Today | Where |
| --- | --- | --- |
| The download can't connect Gmail or Google Calendar | The Google desktop client is a file beside the checkout (`../client_secret_sektar_desktop-app.json`), outside the repository. A build now ships it when that file is there, and sign-in and sync were run with it. `desktop.yml` doesn't provide it, so a CI-built installer has none. Providing it is a decision: anyone with the installer can read a desktop client, which Google allows | `sektar/.github/workflows/desktop.yml`, `packages/desktop/src/bundle-stack.ts` |
| The download is behind Sektar Cloud | The builds for v1.0.3 and v1.0.4 failed, so the latest release is v1.0.2, while Cloud runs the latest release | `sektar/.github/workflows/desktop.yml` |
| Installer details | Files are named `Sektar_0.1.0_*` inside release v1.0.2 (`tauri.conf.json` still says 0.1.0). Unsigned, so the OS asks at first launch. Apple silicon only. Linux has the `.deb`, no AppImage. No automatic updates | Same workflow, `hosts/desktop` |

## Self-hosted Sektar

| Gap | Today | Where |
| --- | --- | --- |
| Configuring Portle | The page has this section, but `hosts/cli/host.js` deliberately removes the Portle plugin, and its README says tunnels are the desktop's and the studio's job | `hosts/cli/host.js`, `hosts/cli/README.md` |
| No published image | The quick start builds from source. The release image is built for Vetra as the App's `host` artifact | `hosts/cli`, `sektar/.github/workflows/vetra.yml` |
| Two Docker paths | `hosts/cli/Dockerfile` is the real one. The root `Dockerfile` and `docker/` are the project template's: a generic Connect and switchboard, still built by `sync-and-publish.yml` | Remove them, or say what they are for |
| The Compose file may break without a Google client | It mounts two client files by default. If they're missing, Docker creates directories at those paths, and the relay check counts that as "own client mounted". Not run | `hosts/cli/docker-compose.yml`, `hosts/cli/oauth-relay.js` |
