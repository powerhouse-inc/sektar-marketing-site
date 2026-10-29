import { expect, test } from "@playwright/test";
import { SESSION_COOKIE } from "./support/renown";

// Embedded (in-page) sign-in, with the headless mock adapter
// (NEXT_PUBLIC_RENOWN_MOCK=1 on the embedded dev server, playwright.config).

test("offers the adapters' login methods", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Sign in with Renown")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect a Wallet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Renown" }),
  ).toHaveCount(0);
});

test("signs in in-page against the switchboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Connect a Wallet" }).click();

  // The mock signs a real EIP-712 credential, the switchboard stores it, and
  // the login page moves on once the session cookie is written.
  await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
  await expect(page.getByTestId("user-name")).toBeVisible({ timeout: 30_000 });
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === SESSION_COOKIE)).toBe(true);
});
