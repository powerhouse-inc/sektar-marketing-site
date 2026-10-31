import { expect, test } from "@playwright/test";
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
