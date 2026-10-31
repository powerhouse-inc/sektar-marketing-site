# Where the product and the docs disagree

The working list for the practice in [README.md](README.md). This file isn't
published. Remove a row when the gap is closed.

Checked 2026-10-31 by reading the code and the published release. Nothing here
was run, except where a row says so.

## Sign-in and identity

Decided by Wouter on 2026-10-31. None of this is built yet. These rules move to
the Configuring Renown sections of `where-sektar-runs.mdx` when those are written.

- **Desktop App:** you sign in when it starts, with Renown (recommended) or a
  local private key saved in the user data root. That identity is the admin the
  switchboard starts with.
- **Storage:** the user data root holds only this. `local.key` is the only new
  secret. Replacing it doesn't change the path. Changing Renown identity does.

  ```
  local.key     the local identity's Ethereum key, encrypted with a password
  local/        the local identity
  0x…/          a Renown identity, by lowercase address
  ```

  Every identity folder has the same contents. Derived and delegated keys stay
  in `.ph`.

  ```
  .ph/                   the full storage tree
  backups/               this identity's backups
  profile-cached.json    the name the loading page shows, public fields only
  profile-cached.<ext>   the avatar it shows: the first of png, jpg, webp
  ```
- **Self-hosted Sektar:** the same rules.
- **Advanced, Desktop App and Self-hosted:** set the Renown instance URL, possibly
  enable the Renown module in their own switchboard, or self-host a dedicated
  Renown instance.
- **Sektar Cloud:** you sign in with an official Renown identity, which maps to
  your own instance and its storage.

| Gap | Today | Where |
| --- | --- | --- |
| Sign-in at start | Released builds start with no admins, so the policy is open and every caller counts as an admin. `feat/delegated-signers` and `feat/delegated-grant` (ADR 0008) enforce sign-in and make the first person to sign in the owner, but only after the stack is up | `hosts/desktop`, `ph-desktop-shell`, `packages/desktop` |
| Signing in before the stack starts | The shell starts the stack in `setup()`, right after opening the loading page, so nothing can come first. Move the start into a command the loading page calls after sign-in, with `PH_USER_DATA_DIR` and `ADMINS` in its environment | `ph-desktop-shell` `src/lib.rs`, `packages/desktop/src/shell-project.ts` |
| A sign-in on the loading page has to reach Connect | Renown binds a credential to a key kept per browser origin. The loading page is a `tauri://` page and Connect is `http://127.0.0.1:6540`, so Connect would ask again. Serve the loading page from Connect's origin | Same |
| Signing in without leaving the window | `consoleLogin` opens the person's browser and polls, so it needs no return address. It's only on the monorepo's `feat/delegated-signers` (`e787eab695`), and `desktop-bridge.js` already expects it | Monorepo |
| Listing the identities on this computer | A page can't read the disk, and the shell has no filesystem plugin. Add a shell command that returns identities only, never keys: `local` when `local.key` exists, and every folder named `0x` plus 40 hex characters. Names and avatars come from the `profile-cached` files, saved at sign-in because a profile can't be fetched offline. They're for display only: the folder name is the identity. The image keeps its own format, and saving a new one removes the old, or the first-match rule would keep showing a stale avatar. The local identity has no Renown profile to cache. Served from Connect's origin, these commands reach Connect and its external packages too, so refuse them once the stack has started | `ph-desktop-shell`, `packages/desktop` (the generated `build.rs` and capabilities) |
| The window's own copy per identity | Storage per identity covers the switchboard only. The window's database (`EBWebView` on Windows) sits outside the data root and is per origin, so a second identity would find the first one's copy. It can't move into an identity's folder, because the loading page runs in it before anyone has signed in. Make the desktop Connect a remote client, as `cli` and `vetra` are, so it holds no documents | `hosts/desktop/host.js` |
| Working offline with sign-in on | `auth.offlineCredentials` (ADR 0008) keeps each verified credential in `.ph/.credentials.json` and accepts it when Renown doesn't answer, so Renown identities work offline once they've signed in. The local identity is different: Renown has never heard of its credential, and the check treats a credential Renown drops as revoked. It needs a way to skip Renown altogether. Read from the code, not run | `packages/reactor-api/src/services/auth.service.ts`, `server.ts` |
| The identity becomes the admin | `ADMINS` comes from the environment, and only the `cli` deployment sets it | Switchboard start, on both hosts |
| `local.key` | Doesn't exist. The format is an Ethereum V3 keystore (Web3 Secret Storage): scrypt and AES-128-CTR in JSON, with the address readable without the password. Nothing in the monorepo reads it and viem has no support, so the shell needs a library for it | `ph-desktop-shell` |
| Signing in with the local key | No such sign-in. `renown.signIn` takes any `signTypedData`, so the shell can sign the delegation to Connect's key like a wallet and then drop the key. Its credential can't go to Renown, so the switchboard needs the Renown module and `RENOWN_SOURCE=self` | `packages/renown`, `hosts/desktop`, `hosts/cli` |
| Replacing the local key | `.ph/.owner.json` records the first person to sign in, but `OwnerClaim` is inert when `ADMINS` is set. So the shell setting `ADMINS` from the current key keeps `./local` working after a replacement. Not tested yet | `ph-desktop-shell` |
| Storage per identity | One store for everyone: `.ph` at the root. Setting `PH_USER_DATA_DIR` to the identity's folder moves all of `.ph` with no change to `hosts/desktop/host.js`. The shell also creates an empty `pglite/` at the root, which has to stop. An existing `.ph` needs moving into the first identity's folder | `ph-desktop-shell` `src/lib.rs`, plus a move for existing installs |
| Self-hosted storage | Documents are in Postgres, with the rest on `/data`, so there's no single path to split by identity | To decide: a database or schema per identity, or one identity per deployment |
| Settings needed before the stack starts | Decided: `settings.json` in the root holds settings shared by every identity, starting with memory limits. Proposed: the shell reads named keys and sets the matching environment variables when it starts the stack, with the environment winning over the file and the file over the default. A free-form block would let the file set `AUTH_ENABLED`. Secrets stay out, as do sign-in settings, ports and protocol flags. The root can't record its own location, so a custom root needs a small pointer in the OS config folder. The installer can't ask on macOS or Linux, so the loading page does: the folder at first run, the rest under Advanced. The shell has no folder picker yet. A missing root must be reported, never recreated empty, or an unplugged drive looks like lost data. Warn about synced folders, because a live database can corrupt there | `ph-desktop-shell`, `packages/desktop` |
| Desktop defaults | The shell sets none of these today. Workflow workers get 256 MB, which crashed on busy mail days, and `PH_WORKFLOWS_EGRESS_ALLOW_ADDRESSES`, which local Vetra runs set so workflows can reach the switchboard, is unset. Memory defaults should follow the machine's RAM | `ph-desktop-shell` |
| Add-on registry | `packageRegistryUrl` in the shipped config is `registry.dev.vetra.io`, a dev registry. `PH_REGISTRY_URL` can override it | `sektar/powerhouse.config.json` |
| Starting without automations | Useful when a workflow crashes the stack at boot. `PH_WORKFLOWS_ENABLED` doesn't cover the plugin path Sektar uses; only `workflows.enabled: false` in the server options does | `apps/switchboard` |
| Choosing a Renown instance | The switchboard takes `RENOWN_URL` and `SWITCHBOARD_URL` at start. Connect receives its config from the host when it's served, not at build time, but nothing passes a chosen URL to it yet. Whether `renown.url` accepts a `$env` token isn't checked | `hosts/connect/host.js`, on both hosts |
| Renown in your own switchboard | The site's e2e switchboard already runs `@powerhousedao/renown-package`, so the module exists. Sektar's hosts don't offer it | `hosts/switchboard/host.js` |

Once the switchboard starts with an admin, the AI gateway mounts on the Desktop
App and Portle's gate can pass. The rest of the Portle row below still applies.

## The home page promises what doesn't exist

The home page's copy is in `sektar-design-elements/design-system/site.html`.

| The site says | Today | To decide |
| --- | --- | --- |
| "Your computer, reachable anywhere", "We add access from anywhere" | Portle can't publish the Desktop App. Its gate needs a host with a listed admin, and the app doesn't start with one (see above). Sektar also has no screen for it, the app doesn't include its tools (`frpc`, Caddy), and the package is marked experimental | Mark it as coming, or change the copy until it works |
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
| The download can't connect Gmail or Google Calendar | The Google desktop client is a file beside the checkout (`../client_secret_sektar_desktop-app.json`), outside the repository. `desktop.yml` doesn't provide it and the stack staging doesn't add it, so a CI-built installer has no client. It works on a developer's machine, which hides this. Read from the code, not run | `sektar/.github/workflows/desktop.yml`, `packages/desktop/src/bundle-stack.ts` |
| The download is behind Sektar Cloud | The builds for v1.0.3 and v1.0.4 failed, so the latest release is v1.0.2, while Cloud runs the latest release | `sektar/.github/workflows/desktop.yml` |
| Installer details | Files are named `Sektar_0.1.0_*` inside release v1.0.2 (`tauri.conf.json` still says 0.1.0). Unsigned, so the OS asks at first launch. Apple silicon only. Linux has the `.deb`, no AppImage. No automatic updates | Same workflow, `hosts/desktop` |
| No AI assistant yet | The gateway doesn't mount on a host with an open policy, on purpose | Follows from the sign-in work above |
| It keeps a second copy of every drive | The window runs its own database and syncs every drive from the local switchboard. The `vetra` and `cli` hosts are remote clients instead, because this stalled the switchboard on the Mail drive (`hosts/vetra/host.js`). Not tested on the Desktop App | `hosts/desktop/host.js` |

## Self-hosted Sektar

| Gap | Today | Where |
| --- | --- | --- |
| Configuring Portle | The page has this section, but `hosts/cli/host.js` deliberately removes the Portle plugin, and its README says tunnels are the desktop's and the studio's job | `hosts/cli/host.js`, `hosts/cli/README.md` |
| No published image | The quick start builds from source. The release image is built for Vetra as the App's `host` artifact | `hosts/cli`, `sektar/.github/workflows/vetra.yml` |
| Two Docker paths | `hosts/cli/Dockerfile` is the real one. The root `Dockerfile` and `docker/` are the project template's: a generic Connect and switchboard, still built by `sync-and-publish.yml` | Remove them, or say what they are for |
| The Compose file may break without a Google client | It mounts two client files by default. If they're missing, Docker creates directories at those paths, and the relay check counts that as "own client mounted". Not run | `hosts/cli/docker-compose.yml`, `hosts/cli/oauth-relay.js` |
