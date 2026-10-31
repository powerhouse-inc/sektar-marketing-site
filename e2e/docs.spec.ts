import { expect, test } from "@playwright/test";
import { panel } from "./support/renown";

// The documentation: Markdown in docs/, inside the site's own header and footer.

const PAGE = "/docs/where-sektar-runs";

test("reaches the documentation from the home page", async ({ page }) => {
  await page.goto("/");
  await page.locator(".site-nav").getByRole("link", { name: "Docs" }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("heading", { level: 1, name: "Documentation" })).toBeVisible();

  await page.getByRole("main").getByRole("link", { name: /Where Sektar runs/ }).click();
  await expect(page).toHaveURL(new RegExp(`${PAGE}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Where Sektar runs" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Documentation" }).getByRole("link", { name: "Where Sektar runs" }),
  ).toHaveAttribute("aria-current", "page");
});

test("compares the three ways to run Sektar, with a section for each", async ({ page }) => {
  await page.goto(PAGE);
  const names = ["Sektar Desktop App", "Sektar Cloud", "Self-hosted Sektar"];
  const headers = page.locator(".site-docs__table thead th");
  await expect(headers).toHaveCount(4);
  for (const [i, name] of names.entries()) {
    await expect(headers.nth(i + 1)).toContainText(name);
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  await expect(page.getByRole("rowheader")).toHaveText(["What it is", "How you start", "Without internet"]);
  await expect(page.locator(".site-docs__notice")).toContainText("Preliminary");

  // The Desktop App and Self-hosted Sektar each say how to configure these.
  for (const name of [
    "Configuring Portle",
    "Configuring Backups",
    "Configuring Renown",
    "Configuring Integrations",
  ]) {
    await expect(page.getByRole("heading", { level: 3, name })).toHaveCount(2);
  }
});

test("leads from each column to where you get that Sektar", async ({ page }) => {
  await page.goto(PAGE);
  const headers = page.locator(".site-docs__table thead th");

  await headers.nth(3).getByRole("link", { name: "Set it up" }).click();
  await expect(page).toHaveURL(/#self-hosted-sektar$/);
  await expect(page.locator("#self-hosted-sektar")).toBeInViewport();

  await headers.nth(2).getByRole("link", { name: "Open my Sektar" }).click();
  await expect(page).toHaveURL(/\/login\?want=vetra$/);
  await expect(panel(page).getByRole("heading", { name: "Open your Sektar" })).toBeVisible();

  await page.goto(PAGE);
  await headers.nth(1).getByRole("link", { name: "Download" }).click();
  await expect(page).toHaveURL(/\/download$/);
  await expect(page.getByRole("heading", { level: 1, name: "Download Sektar" })).toBeVisible();
});

test("has a download page, for now a placeholder with the latest release", async ({ page, request }) => {
  await page.goto("/download");
  await expect(page).toHaveTitle("Download · Sektar");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/download$/);
  await expect(page.getByText("To be written")).toBeVisible();
  await expect(page.getByRole("link", { name: "Latest release on GitHub" })).toHaveAttribute(
    "href",
    /github\.com\/powerhouse-inc\/sektar\/releases\/latest$/,
  );
  // The logo's sprite comes with the site's frame.
  await expect(page.locator(".site-header__brand use").first()).toHaveAttribute("href", "#sektar-symbol");
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/download</loc>");
});

test("describes itself, not the home page, to search engines", async ({ page, request }) => {
  await page.goto(PAGE);
  await expect(page).toHaveTitle("Where Sektar runs · Sektar docs");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${PAGE}$`));
  expect(await (await request.get("/sitemap.xml")).text()).toContain(`${PAGE}</loc>`);
});

test("keeps the site's header working", async ({ page }) => {
  await page.goto(PAGE);
  // The home page's sections are a page away.
  await expect(page.locator(".site-nav").getByRole("link", { name: "Get started" })).toHaveAttribute(
    "href",
    "/#start",
  );
  await expect(page.locator(".site-header__brand")).toHaveAttribute("href", "/#top");
  // The logo's sprite is on this page, so its reference stays a local one.
  await expect(page.locator(".site-header__brand use").first()).toHaveAttribute("href", "#sektar-symbol");
  await expect(page.locator(".site-footer use").first()).toHaveAttribute("href", "#sektar-symbol");
  await page.locator(".site-header__login").click();
  await expect(page).toHaveURL(/\/login$/);
});

test("fits a phone: rows stack, cells name their column, and the links stay", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  const head = page.locator(".site-docs__table thead");
  for (const name of ["Download", "Open my Sektar", "Set it up"]) {
    await expect(head.getByRole("link", { name })).toBeVisible();
  }
  await expect(page.locator(".site-docs__table td").first()).toHaveAttribute(
    "data-label",
    "Sektar Desktop App",
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("has no page for an address the documentation doesn't list", async ({ request }) => {
  expect((await request.get("/docs/no-such-page")).status()).toBe(404);
});
