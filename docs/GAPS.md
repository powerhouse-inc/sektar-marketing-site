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
| Not released | The download is v1.0.7, built with shell 0.1.0, which can't find the stack it bundles: on macOS it stays on the loading page (tried on a Mac on 2026-11-03), and there has been no Windows installer since v1.0.3. The fixes are on the `fix/desktop-release-pipeline` branches of `powerhouse` and `sektar` | Release order: shell crate 0.1.1, monorepo, bump it in `sektar`, run the desktop workflow |
| macOS and Linux | Built in CI, but the only run is v1.0.7 on a Mac, by hand, with a launch command. `desktop.yml` now starts the packaged app on all three, not yet run | `sektar/qa/desktop/smoke.mjs`, through `desktop.yml` |
| Installing | Sektar is signed ad hoc, by no registered developer, so macOS and Windows ask before the first launch, as the page says. v1.0.7's bundle had no signature over it at all, so a copy downloaded with a browser may be called damaged. Decided by Wouter on 2026-11-03: no Developer ID while there are no end users | An Apple Developer ID and notarization; a Windows code-signing certificate |
| Google sign-in and the demo key in the download | CI builds have neither: the files aren't in the repository. `desktop.yml` writes them from the repository secrets `GOOGLE_DESKTOP_OAUTH_CLIENT` and `OPENROUTER_DEMO_KEY`, which aren't set yet. Shipping both was decided by Wouter on 2026-11-03 | The `sektar` repository's secrets |
| A real Renown sign-in | The acceptance tests use a stand-in that signs real credentials. The official Renown hasn't been tried with a real wallet | Wouter, on the installed app |
| Self-hosted storage | Documents are in Postgres, with the rest on `/data`, so there's no single path to split by identity | To decide: a database or schema per identity, or one identity per deployment |
| Add-on registry | Stays on `registry.dev.vetra.io` on purpose until the production registry (UAT) is updated: decided by Wouter on 2026-10-31. It's the one dev value in a production build. `registryUrl` in `settings.json` overrides it, which is passed on but not tested end to end | `sektar/powerhouse.config.json` |
| Automations reaching this computer | `PH_WORKFLOWS_EGRESS_ALLOW_ADDRESSES` isn't set, so an automation can't reach a private address such as a local model server. `settings.json` has no key for it | `ph-desktop-shell` |
| Concurrency defaults | `concurrency.workflowRuns` passes through when set. Left out, the stack's default applies, which doesn't follow the machine | `ph-desktop-shell` |
| Admins' operational views | `INSPECTION_ADMIN_ENABLED` is on for the `cli` host and in the checkout's `.env`, and on nothing for the Desktop App, whose admins don't get them | Decide, then `hosts/desktop` or the shell |
| Closing Sektar | On local `main`, quitting and changing identity close the databases first, and it's tested. The app people have kills the stack, so every start repairs them | Released with the rest |
| What automations keep | On local `main`, it stays with the identity. The app people have keeps the key to connected accounts, and up to 1 GB of downloaded attachments, in its install folder, shared by every identity, so the folder on the page isn't everything: a copy of it can't read its connected accounts. An identity with no key takes a copy of the old one, so accounts already connected keep working | Released with the rest |
| Slow to start | On local `main`, on a fast desktop doing nothing else, the stack alone takes 6.5 s after a clean stop and 11.6 s for a new identity, down from 12 s and 18 s, now that the databases open together, GraphQL is composed twice rather than four times, and the build tools and browser code are gone. With `bundleBackend` on it's 5.3 s and 10.5 s. On a laptop it still feels a little slow, with no figure yet, and Wouter's view on 2026-11-01 is that a load indicator would cover it. A first start after a reboot took 69 s before this work, nearly all of it reading files before the app logs anything, and the window says nothing meanwhile. A bundled start reads 321 files rather than 9,238, which should help most there, but that isn't measured | `packages/desktop/src/bundle-stack.ts`, the loading page |
| Slow to install on Windows | A stack of 146,000 files took 20 minutes on a laptop, as Windows creates and scans each one. On local `main` it's about 36,000. With `bundleBackend` on it's 3,845 files and 212 MB, in a 61 MB installer, which installed in under a minute on a laptop, and in 8 s on a fast desktop, where it uninstalled in 2 s. It passes all 24 acceptance tests installed, and Google accounts worked first time on the laptop. Sektar turns it on for every OS from the next release, decided by Wouter on 2026-11-03. It's off by default for other projects, and hasn't been built on macOS or Linux yet | `bundleBackend` in `sektar/hosts/desktop/host.js` |
| Long usernames | The stack's deepest path is 208 characters, so under `C:\Users\<name>\AppData\Local\Sektar\stack\` a username of about 20 characters or more passes Windows' limit of 260, and that file can't install. Not tried. With `bundleBackend` on, the longest full path is 139 characters, which no username reaches | Same |
| Uninstalling leaves files behind | Uninstalling removes only what the last install listed, so an install over an older one leaves the older files behind for good: after a day of builds on one computer, 154,000 stayed. Keys and the Google client are removed, and the user's data is kept on purpose. Installing over them works, and with `bundleBackend` on all but one of the tests passed on that, the one being the leftovers fixed under "What automations keep" | NSIS, `ph-desktop-shell` |
| Nothing starts a packaged app in CI | Up to v1.0.7, `desktop.yml` built the installer and checked the file exists, so v1.0.7's macOS app, which never starts its stack, passed. `qa/desktop/smoke.mjs` now starts the app and its stack on each OS, and a release waits for all three. Run on Windows against an older local build, not yet in CI | `sektar/.github/workflows/desktop.yml` |
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
