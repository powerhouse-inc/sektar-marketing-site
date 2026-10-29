import { expect, type Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { privateKeyToAccount } from "viem/accounts";
import { FAKE_RENOWN_URL, SWITCHBOARD_URL } from "../../playwright.config";

/* The redirect-mode dev server's Renown portal is a fake origin. These helpers
   do what renown.id does for a returning user: sign a delegation credential
   for the app's key with the user's wallet, store it on the switchboard, and
   send the browser back to the app with `?user=<did>`. */

// The well-known Anvil test account #0.
const ANVIL_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
export const TEST_ACCOUNT = privateKeyToAccount(ANVIL_KEY);
const CHAIN_ID = 1;
// Must match NEXT_PUBLIC_RENOWN_APP_NAME in playwright.config.ts.
const APP_NAME = "fusion-e2e";

// RENOWN_SESSION_COOKIE from @renown/sdk/node. Specs load as CommonJS, which
// the SDK's dependencies do not support, so the SDK stays out of the specs and
// runs in ./issue-credential.mjs instead.
export const SESSION_COOKIE = "renown_session";

async function issueCredential(appDid: string): Promise<string> {
  const { stdout } = await promisify(execFile)(process.execPath, [
    join(__dirname, "issue-credential.mjs"),
    SWITCHBOARD_URL,
    APP_NAME,
    appDid,
    ANVIL_KEY,
    String(CHAIN_ID),
  ]);
  return stdout.trim();
}

export type RenownVisit = { appDid: string; returnUrl: URL };

/**
 * Plays renown.id for `page`. `returnTo` picks where the user is sent back:
 * the app's own `returnUrl` by default, or another path of the app.
 */
export async function fakeRenownPortal(
  page: Page,
  returnTo?: (visit: RenownVisit) => URL,
): Promise<RenownVisit[]> {
  const visits: RenownVisit[] = [];
  await page.route(`${FAKE_RENOWN_URL}/**`, async (route) => {
    const url = new URL(route.request().url());
    const visit = {
      appDid: url.searchParams.get("connect") ?? "",
      returnUrl: new URL(url.searchParams.get("returnUrl") ?? ""),
    };
    visits.push(visit);
    const userDid = await issueCredential(visit.appDid);
    const back = returnTo ? returnTo(visit) : new URL(visit.returnUrl);
    back.searchParams.set("user", userDid);
    await route.fulfill({ status: 302, headers: { location: back.href } });
  });
  return visits;
}

/** Signs `page` in through the redirect flow and waits for the session cookie. */
export async function signIn(page: Page, path = "/login") {
  await fakeRenownPortal(page);
  await page.goto(path);
  await page.getByRole("button", { name: "Continue with Renown" }).click();
  await expect(page.getByTestId("user-name")).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name === SESSION_COOKIE),
    )
    .toBe(true);
}
