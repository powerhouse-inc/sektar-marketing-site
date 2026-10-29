import { expect, test, type Page } from "@playwright/test";
import {
  fakeRenownPortal,
  SESSION_COOKIE,
  TEST_ACCOUNT,
} from "./support/renown";

// Redirect sign-in, the template's default mode, against the fake portal.

async function expectSignedIn(page: Page, path = "/") {
  await page.waitForURL((url) => url.pathname === path, { timeout: 30_000 });
  await expect(page.getByTestId("user-name")).toBeVisible({ timeout: 30_000 });
  // The DID was consumed: a reload must not sign in from the URL again.
  expect(new URL(page.url()).searchParams.has("user")).toBe(false);
  // The session cookie is written, so the proxy and the server side see it.
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === SESSION_COOKIE)).toBe(true);
}

test("sends a signed-out visitor to /login", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/login");
  await expect(page.getByText("Sign in with Renown")).toBeVisible();
});

test("offers only the Renown redirect, no wallet methods", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Continue with Renown" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /wallet/i })).toHaveCount(0);
});

test("completes a redirect sign-in round trip", async ({ page }) => {
  const visits = await fakeRenownPortal(page);
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Renown" }).click();

  await expectSignedIn(page);

  // The portal was asked to send the user back to the page that started the
  // sign-in, without a stale `user` param.
  expect(visits).toHaveLength(1);
  expect(visits[0].appDid).toMatch(/^did:key:/);
  expect(visits[0].returnUrl.pathname).toBe("/login");
  expect(visits[0].returnUrl.searchParams.has("user")).toBe(false);
});

test("keeps the DID when the return lands on a protected path", async ({
  page,
}) => {
  // The proxy sends an unauthenticated visitor to /login and must carry
  // `?user=` along, or the sign-in never completes.
  await fakeRenownPortal(page, ({ returnUrl }) => new URL("/", returnUrl));
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Renown" }).click();

  await expectSignedIn(page);
});

test("returns to the page the visitor asked for", async ({ page }) => {
  await fakeRenownPortal(page);
  await page.goto("/drives/powerhouse");
  await page.waitForURL("**/login?next=*");
  await page.getByRole("button", { name: "Continue with Renown" }).click();

  await expectSignedIn(page, "/drives/powerhouse");
});

test("logs out", async ({ page }) => {
  await fakeRenownPortal(page);
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Renown" }).click();
  await expectSignedIn(page);
  await expect(page.getByTestId("user-name")).toContainText(
    TEST_ACCOUNT.address.slice(0, 6),
  );

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login");
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name === SESSION_COOKIE),
    )
    .toBe(false);
  // Signed out for real: the proxy gates the app again.
  await page.goto("/");
  await page.waitForURL("**/login");
});
