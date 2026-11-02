# Setup Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** While a new cloud Sektar is set up, the dialog shows a checklist of the real steps (option A from the 2 Nov mockups), each ticked off with when it finished.

**Architecture:** A pure `setupSteps(signals, now)` maps Vetra's signals (directory entry, `environmentPods`, `environmentEvents`, Sektar answering) to six steps; the controller polls the signals in `startCloud` and renders the list inside the existing `[data-step="busy"]` block (the dialog markup is synced from the design system and is not edited).

**Tech Stack:** Next.js, TypeScript, `node --test` for `lib/*.test.mjs`, Playwright e2e, pnpm.

**Spec:** `vetra-cloud-package/docs/superpowers/specs/2026-11-02-app-warm-pool-design.md` §6 item 3, and the mockup option A (`.superpowers/brainstorm/…/progress-options.html`, card "A · Checklist of real steps").

## Global Constraints

- Steps and copy, exactly, in order:
  1. "Invite code accepted"
  2. "Your environment is reserved" (sub: "its own address and storage, only yours")
  3. "Database ready"
  4. "Downloading Sektar" (sub: "the first start fetches the app")
  5. "Starting Sektar"
  6. "Opening it for you"
- Title "Setting up your Sektar", the environment's host under it once known.
- Footer, exactly: "Usually about 3 minutes. You can close this: it stays listed under “On this device”."
- Each done step shows its finish time as elapsed `m:ss` since redeem (`elapsed` from `lib/cloud-wait.ts`).
- Never edit `content/` or `public/sk/` (AGENTS.md); build the list in the controller.
- Observability needs the caller to see the environment (backend plan Task 1): any error from those queries means "no signal yet", never a failure of the setup.
- Commands: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm check:bundle`, `pnpm test:e2e`.

## Review Focus

1. A warm claim: several steps become true in the same poll; all tick at once with the same time, none is skipped visually. → Task 1 test.
2. Observability refuses (FORBIDDEN before the owner is set, or an older backend): the checklist still advances on the directory and on Sektar answering. → Task 1 test.
3. Signals go backwards between polls (a pod restarts on the claim): a ticked step stays ticked. → Task 1 test.
4. The redeem fails: no checklist is left half-rendered; the existing failure message shows. → Task 2 test.

---

### Task 1: `setupSteps` and the signal fetch

**Files:**
- Create: `lib/setup-steps.ts`, `lib/setup-steps.test.mjs`
- Modify: `lib/environments.ts` (add `fetchSetupSignals`)

**Interfaces:**
- Produces:
  - `type SetupSignals = { redeemed: boolean; reserved: boolean; databaseReady: boolean; pulling: boolean; starting: boolean; serving: boolean }`
  - `type StepState = { id: "accepted" | "reserved" | "database" | "download" | "start" | "open"; label: string; sub?: string; done: boolean; current: boolean; doneAt: number | null }`
  - `setupSteps(signals: SetupSignals, previous: StepState[] | null, now: number): StepState[]` — a step is done when its signal or any later step's signal is true, or it was done in `previous` (monotonic); `doneAt` keeps the first time it became done; exactly one `current` (the first not done), none when all done.
  - `fetchSetupSignals(host: string, bearer: string): Promise<Omit<SetupSignals, "redeemed" | "reserved" | "serving">>` in `lib/environments.ts`: `myEnvironments` → the tenant whose subdomain is the host's first label; then `environmentPods(tenantId)` (`databaseReady` = a `component: "database"` pod `ready`; `starting` = the `component: "app"` pod `RUNNING`) and `environmentEvents(tenantId, limit: 20)` (`pulling` = a `Pulling` event on the app pod); any error or missing data → all false.
- [ ] **Step 1: Write the failing tests** (`lib/setup-steps.test.mjs`, node:test):
  - only `redeemed` → step 1 done, step 2 current.
  - `serving` alone → all six done with the same `doneAt` (Review Focus 1).
  - `databaseReady` false but `starting` true → steps 1–5 done (later signals imply earlier steps).
  - previous had "database" done, new signals all false except `redeemed` → "database" still done, `doneAt` unchanged (Review Focus 3).
  - signals from a refused observability (all three false) with `reserved` and `serving` → advances to done (Review Focus 2).
  - labels and subs equal the Global Constraints strings.
- [ ] **Step 2: Run** `pnpm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `setup-steps.ts` (pure, no imports) and `fetchSetupSignals` (same `VETRA_GRAPHQL_URL` and bearer as `redeemCloud`).
- [ ] **Step 4: Run** `pnpm test && pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(cloud): the setup steps of a new cloud Sektar`.

### Task 2: Render the checklist while a cloud Sektar starts

**Files:**
- Modify: `components/site-controller.tsx` (`startCloud`, `busy`/`step` area), `app/globals.css` or the site's own stylesheet for `.site-setup-*` classes (not `public/sk/`)
- Test: `e2e/site.spec.ts` (the local switchboard stub: extend it to answer `myEnvironments`, `environmentPods`, `environmentEvents`)

**Interfaces:**
- Consumes: `setupSteps`, `fetchSetupSignals` (Task 1), `newEnvironment`, `elapsed`, `serves` (existing).
- Produces: inside `[data-step="busy"]`, an `<ol class="site-setup">` (one `<li>` per step with state classes `is-done` / `is-current`, the time, and the sub line) plus the footer `<p>`; removed when the busy step is left or the setup fails.
- [ ] **Step 1: Write the failing e2e test**: redeem against the stub that reports, in successive polls, reserved → database ready → pulling → app running → serving; the dialog shows the six labels in order, ticks them in sequence, shows the footer copy, then navigates. A second case: the redeem mutation is refused → the existing failure message shows and no `.site-setup` list is in the DOM (Review Focus 4).
- [ ] **Step 2: Run** `pnpm test:e2e`. Expected: FAIL.
- [ ] **Step 3: Implement**: in `startCloud`, keep `previous` steps; each poll gathers `reserved` (from `newEnvironment`), the signals (when the host is known), `serving` (from `serves`) and re-renders; the title becomes "Setting up your Sektar" with the host under it.
- [ ] **Step 4: Run** `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm check:bundle && pnpm test:e2e`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(cloud): show the real setup steps while a cloud Sektar starts`.

### Task 3: Verify and deploy (after the backend's observability auth is on production)

- [ ] **Step 1:** Whole-branch review; fix Critical/Important.
- [ ] **Step 2:** PR to `main`; CI green; the PR preview (vetra-deploy-action) renders the dialog.
- [ ] **Step 3: Production:** merge to `main` (vetra.yml deploys sektar.vetra.io). Check the live bundle contains "Usually about 3 minutes".
- [ ] **Step 4:** Redeem a fresh invite code on sektar.vetra.io and watch the checklist through to the open environment (with Sektar's warm pool at 1 once the console is live: most steps tick at once).
