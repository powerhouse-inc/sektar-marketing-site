import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "../playwright.config";
import {
  panel,
  fakeRenownPortal,
  SESSION_COOKIE,
  signIn,
  TEST_DID,
} from "./support/renown";

// The site: the design system's prototype, rendered verbatim, with sign-in on
// the Renown SDK and the "where does your Sektar run?" forwarding.

/* Nothing listens here: the probe fails at once. */
const UNREACHABLE = "http://localhost:9/";

test("renders the page from the design system", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  // The hero and title are the vendored prototype's, whatever their current copy.
  const sections = join(__dirname, "..", "content", "sections");
  const hero = readFileSync(join(sections, "main.html"), "utf8")
    .match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(hero);
  const meta = JSON.parse(readFileSync(join(sections, "meta.json"), "utf8")) as {
    title: string;
  };
  await expect(page).toHaveTitle(meta.title);
  await expect(page.locator(".site-header__login")).toBeVisible();
  // Logging in is a page of its own.
  await expect(page.locator(".site-header__login")).toHaveAttribute("href", "/login");
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(page.locator(".site-start").getByRole("link", { name: "Get it in the cloud" })).toHaveAttribute(
    "href",
    "/login?want=vetra",
  );
  // The documentation-only parts of the prototype are not on the site.
  await expect(page.locator(".doc-topbar, .site-notes")).toHaveCount(0);
  // Every image the page uses is vendored and loads.
  const broken = await page.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
  );
  expect(broken).toEqual([]);
});

test("serves robots and a sitemap", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
  expect(await (await request.get("/sitemap.xml")).text()).toContain("<loc>");
});

test("signs in with Renown and lands on the where step", async ({ page }) => {
  const visits = await fakeRenownPortal(page);
  await page.goto("/");
  await page.locator(".site-header__login").click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle("Log in · Sektar");
  await expect(panel(page).getByRole("heading", { name: "Open your Sektar" })).toBeVisible();
  await panel(page).getByRole("button", { name: "Continue with Renown" }).click();

  await expect(
    panel(page).getByRole("heading", { name: "Where does your Sektar run?" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(panel(page).locator("[data-site-did]")).toHaveText(TEST_DID);
  // Renown was asked to return to the page that left; the DID was consumed.
  expect(visits).toHaveLength(1);
  expect(visits[0].appDid).toMatch(/^did:key:/);
  expect(visits[0].returnUrl.pathname).toBe("/login");
  expect(new URL(page.url()).searchParams.has("user")).toBe(false);
  // Signed in: the header offers the person's Sektar, and the cookie is set.
  await expect(page.locator("body")).toHaveClass(/is-signed-in/);
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name === SESSION_COOKIE),
    )
    .toBe(true);

  // A reload renders the signed-in header on the server.
  await page.reload();
  await expect(page.locator("body")).toHaveClass(/is-signed-in/);
});

test("takes a signed-in person straight to where their Sektar runs", async ({ page }) => {
  await signIn(page);
  await page.goto("/");
  await page.locator(".site-header__user").click();
  await expect(panel(page).getByRole("heading", { name: "Where does your Sektar run?" })).toBeVisible();
  await expect(panel(page).getByRole("heading", { name: "Open your Sektar" })).toBeHidden();
});

test("opens on Sektar cloud from a cloud link, through the sign-in", async ({ page }) => {
  await signIn(page, "/login?want=vetra");
  await expect(panel(page).getByLabel("Environment name")).toBeVisible();
  await expect(panel(page).getByRole("button", { name: "Sektar cloud" })).toHaveAttribute("aria-pressed", "true");
});

test("says so when Renown did not confirm the sign-in", async ({ page }) => {
  await fakeRenownPortal(page, { issue: false });
  await page.goto("/");
  await page.locator(".site-header__login").click();
  await panel(page).getByRole("button", { name: "Continue with Renown" }).click();
  await expect(panel(page).getByRole("heading", { name: "That didn't work" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator("body")).not.toHaveClass(/is-signed-in/);
  await expect(panel(page).getByRole("link", { name: "Back" })).toHaveAttribute("href", "/#top");
});

test("builds the address from what the person types", async ({ page }) => {
  await signIn(page);
  const input = panel(page).getByLabel("Your address");
  await input.fill("marit.studio");
  await expect(panel(page).locator("[data-site-preview]")).toHaveText(
    "Opens https://app.marit.studio/",
  );

  // Sektar cloud: the prefix and suffix come from the cloud URL template (a
  // Sektar host is served at its environment's apex, https://{name}.vetra.io/).
  await panel(page).getByRole("button", { name: "Sektar cloud" }).click();
  await expect(panel(page).locator("[data-site-prefix]")).toHaveText("https://");
  await expect(panel(page).locator("[data-site-suffix]")).toHaveText(".vetra.io");
  await panel(page).getByLabel("Environment name").fill("marit");
  await expect(panel(page).locator("[data-site-preview]")).toHaveText(
    "Opens https://marit.vetra.io/",
  );

  // Not a name: the field says what it wants, and nothing opens.
  await panel(page).getByLabel("Environment name").fill("not a name!");
  await panel(page).getByRole("button", { name: "Open my Sektar" }).click();
  // The page also has the invite code's field: the address input's own.
  const field = panel(page).locator(".sk-field", { has: page.locator("[data-site-where-input]") });
  await expect(field).toHaveClass(/sk-field--error/);
  await expect(panel(page).locator("[data-site-where-hint]")).toContainText("letters, digits and dashes");
});

test("tells the person when their computer isn't answering, and remembers it", async ({
  page,
}) => {
  await signIn(page);
  await panel(page).getByLabel("Your address").fill(UNREACHABLE);
  await panel(page).getByRole("button", { name: "Open my Sektar" }).click();
  await expect(
    panel(page).getByRole("heading", { name: "Your computer isn't answering" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(panel(page).locator("[data-site-down-host]")).toHaveText("localhost");

  // Back to the list: the address is remembered on this device, and can be forgotten.
  await panel(page).getByRole("button", { name: "Back" }).click();
  const row = panel(page).locator("[data-site-envs] li", { hasText: UNREACHABLE });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: `Forget ${UNREACHABLE}` }).click();
  await expect(row).toHaveCount(0);
});

test("opens an address that answers", async ({ page }) => {
  await signIn(page);
  const target = `${SITE_URL}/robots.txt`;
  await panel(page).getByLabel("Your address").fill(target);
  await panel(page).getByRole("button", { name: "Open my Sektar" }).click();
  await page.waitForURL(target, { timeout: 15_000 });
});

test("follows an ?env= link through the sign-in", async ({ page }) => {
  await fakeRenownPortal(page);
  await page.goto(`/?env=${encodeURIComponent(UNREACHABLE)}`);
  // The link goes on to the sign-in page, comes off the address bar, and is
  // carried through Renown.
  await expect(page).toHaveURL(/\/login/);
  await expect.poll(() => new URL(page.url()).searchParams.has("env")).toBe(false);
  await panel(page).getByRole("button", { name: "Continue with Renown" }).click();
  await expect(
    panel(page).getByRole("heading", { name: "Your computer isn't answering" }),
  ).toBeVisible({ timeout: 30_000 });
});

test("signs out from the sign-in page", async ({ page }) => {
  await signIn(page);
  await panel(page).getByRole("button", { name: "Sign out" }).click();
  await expect(panel(page).getByRole("heading", { name: "Open your Sektar" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveClass(/is-signed-in/);
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name === SESSION_COOKIE),
    )
    .toBe(false);
});

/* ------------------------------------------------ a new cloud Sektar */

const VETRA = "http://vetra.test/graphql";
const DIRECTORY = "http://directory.test";
const NEW_HOST = "noble-lark.vetra.test";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

const SETUP_LABELS = [
  "Invite code accepted",
  "Your environment is reserved",
  "Database ready",
  "Downloading Sektar",
  "Starting Sektar",
  "Opening it for you",
];

/** Stands in for Vetra, its directory and the new Sektar; `state.stage` is what they report. */
async function fakeVetra(page: Page, options: { refuse?: boolean } = {}) {
  const state = { stage: 0 };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, headers: CORS, contentType: "application/json", body: JSON.stringify(body) });
  const preflight = (route: Route) => route.request().method() === "OPTIONS" && route.fulfill({ status: 204, headers: CORS });

  await page.route(`${VETRA}`, async (route) => {
    if (await preflight(route)) return;
    const { query, variables } = route.request().postDataJSON() as { query: string; variables?: { t?: string } };
    if (query.includes("redeemInviteCode")) {
      if (options.refuse) return json(route, { errors: [{ message: "Code already used" }] });
      return json(route, { data: { vetraSubscriptions: { redeemInviteCode: { __typename: "X" } } } });
    }
    if (query.includes("myEnvironments"))
      return json(route, { data: { myEnvironments: [{ id: "e1", name: "Sektar", subdomain: "noble-lark", tenantId: "t1", status: "PROVISIONING" }] } });
    if (query.includes("environmentPods")) {
      const pods = [];
      if (state.stage >= 2) pods.push({ name: "db-0", component: "database", phase: "RUNNING", ready: true });
      if (state.stage >= 4) pods.push({ name: "powerhouse-t1-app-0", component: "app", phase: "RUNNING", ready: false });
      return json(route, { data: { environmentPods: pods } });
    }
    if (query.includes("environmentEvents") && variables?.t === "t1") {
      const events = state.stage >= 3 ? [{ reason: "Pulling", involvedObject: "Pod/powerhouse-t1-app-0" }] : [];
      return json(route, { data: { environmentEvents: events } });
    }
    return json(route, { data: {} });
  });
  await page.route(`${DIRECTORY}/**`, async (route) => {
    if (await preflight(route)) return;
    const environments =
      state.stage >= 1
        ? [{ connectUrl: `https://${NEW_HOST}/`, kind: "vetra", name: "Sektar", status: state.stage >= 5 ? "READY" : "PROVISIONING" }]
        : [];
    return json(route, { environments });
  });
  await page.route(`https://${NEW_HOST}/**`, async (route) => {
    if (route.request().url().endsWith("build-hash.json"))
      return route.fulfill(
        state.stage >= 5
          ? { status: 200, headers: CORS, contentType: "application/json", body: "{}" }
          : { status: 503, headers: CORS, body: "no available server" },
      );
    return route.fulfill({ status: 200, contentType: "text/html", body: "<title>Sektar</title>" });
  });
  return state;
}

async function redeem(page: Page, code = "vetra-test") {
  await signIn(page);
  await panel(page).getByRole("button", { name: "Sektar cloud" }).click();
  await panel(page).getByLabel("Invite code").fill(code);
  await panel(page).getByRole("button", { name: "Start my cloud Sektar" }).click();
}

test("shows the real setup steps while a cloud Sektar starts", async ({ page }) => {
  const vetra = await fakeVetra(page);
  await redeem(page);
  const steps = panel(page).locator("ol.site-setup > li");
  await expect(panel(page).getByRole("heading", { name: "Setting up your Sektar" })).toBeVisible();
  await expect(steps).toHaveText(SETUP_LABELS.map((l) => new RegExp(l)));
  await expect(panel(page).locator("[data-step=busy]")).toContainText(
    "Usually about 3 minutes. You can close this: it stays listed under “On this device”.",
  );
  // Redeemed, nothing reserved yet: the second step is the one in progress.
  await expect(steps.nth(0)).toHaveClass(/is-done/);
  await expect(steps.nth(1)).toHaveClass(/is-current/);

  const tick = async (stage: number, done: number) => {
    vetra.stage = stage;
    await expect(steps.nth(done)).toHaveClass(/is-current/, { timeout: 15_000 });
    for (let i = 0; i < done; i++) await expect(steps.nth(i)).toHaveClass(/is-done/);
  };
  await tick(1, 2);
  await expect(panel(page).locator(".site-setup__host")).toHaveText(NEW_HOST);
  await tick(2, 3);
  await expect(steps.nth(3)).toContainText("the first start fetches the app");
  await tick(3, 4);
  await expect(steps.nth(0).locator(".site-setup__time")).toHaveText(/^\d+:\d\d$/);
  await tick(4, 5);

  vetra.stage = 5;
  await page.waitForURL(`https://${NEW_HOST}/`, { timeout: 15_000 });
});

test("shows no checklist when the invite code is refused", async ({ page }) => {
  await fakeVetra(page, { refuse: true });
  await redeem(page);
  await expect(panel(page).locator("[data-site-fail-text]")).toContainText("That code didn't work: Code already used");
  await expect(page.locator(".site-setup")).toHaveCount(0);
});

test("leaving the page mid-setup stops the polling, and the new Sektar stays listed", async ({ page }) => {
  const vetra = await fakeVetra(page);
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().startsWith(VETRA) || r.url().startsWith(DIRECTORY)) requests++;
  });
  await redeem(page);
  vetra.stage = 1;
  await expect(panel(page).locator("ol.site-setup > li").nth(2)).toHaveClass(/is-current/, { timeout: 15_000 });

  await page.goto("/");
  await page.waitForTimeout(700); // let an in-flight poll finish
  const settled = requests;
  await page.waitForTimeout(1500); // three poll intervals
  expect(requests).toBe(settled);

  // Back on the sign-in page: no stale list, and the new Sektar is offered.
  await page.locator(".site-header__user").click();
  await expect(panel(page).getByRole("heading", { name: "Where does your Sektar run?" })).toBeVisible();
  await expect(page.locator(".site-setup")).toHaveCount(0);
  await expect(panel(page).locator("[data-site-envs] li", { hasText: NEW_HOST })).toBeVisible();
});
