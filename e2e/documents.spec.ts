import { expect, test } from "@playwright/test";
import { signIn } from "./support/renown";

// The data layer through the light client: list drives, open one, rename its
// document with a signed dispatch, and watch a second tab pick it up live.

test("lists drives and opens one", async ({ page }) => {
  await signIn(page);
  await page.goto("/");

  const card = page.getByTestId("drive-card").first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.getByRole("link", { name: "View drive" }).click();

  await page.waitForURL("**/drives/**");
  await expect(page.getByTestId("drive-name")).not.toBeEmpty();
});

test("renames a document and a second tab sees it live", async ({
  page,
  context,
}) => {
  await signIn(page);
  // A direct load renders on the server first: it must not fail there.
  const response = await page.goto("/documents/powerhouse");
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("document-name")).not.toBeEmpty({
    timeout: 30_000,
  });

  // A second tab on the same document, not reloaded below.
  const other = await context.newPage();
  await other.goto("/documents/powerhouse");
  await expect(other.getByTestId("document-name")).not.toBeEmpty({
    timeout: 30_000,
  });

  const name = `Renamed ${Date.now()}`;
  await page.getByLabel("New name").fill(name);
  await page.getByRole("button", { name: "Rename" }).click();

  await expect(page.getByTestId("document-name")).toHaveText(name, {
    timeout: 30_000,
  });
  // Realtime: the change reaches the other tab without a reload.
  await expect(other.getByTestId("document-name")).toHaveText(name, {
    timeout: 30_000,
  });
});
