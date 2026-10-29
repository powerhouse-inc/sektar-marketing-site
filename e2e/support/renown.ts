import { expect, type Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { privateKeyToAccount } from "viem/accounts";
import {
  E2E_APP_NAME,
  FAKE_RENOWN_URL,
  SWITCHBOARD_URL,
} from "../../playwright.config";

/* The site's Renown portal is a fake origin in e2e. These helpers do what
   renown.id does for a returning user: sign a delegation credential for the
   site's key with the user's wallet, store it on the switchboard, and send the
   browser back with `?user=<did>`. */

// The well-known Anvil test account #0.
const ANVIL_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
export const TEST_ACCOUNT = privateKeyToAccount(ANVIL_KEY);
const CHAIN_ID = 1;
export const TEST_DID = `did:pkh:eip155:${CHAIN_ID}:${TEST_ACCOUNT.address.toLowerCase()}`;

// RENOWN_SESSION_COOKIE from @renown/sdk/node. Specs load as CommonJS, which
// the SDK's dependencies do not support, so the SDK stays out of the specs and
// runs in ./issue-credential.mjs instead.
export const SESSION_COOKIE = "renown_session";

async function issueCredential(appDid: string): Promise<string> {
  const { stdout } = await promisify(execFile)(process.execPath, [
    join(__dirname, "issue-credential.mjs"),
    SWITCHBOARD_URL,
    E2E_APP_NAME,
    appDid,
    ANVIL_KEY,
    String(CHAIN_ID),
  ]);
  return stdout.trim();
}

export type RenownVisit = { appDid: string; returnUrl: URL };

/**
 * Plays renown.id for `page`. With `issue: false` it sends the user back
 * without storing a credential: what the site sees when Renown did not
 * confirm the sign-in.
 */
export async function fakeRenownPortal(
  page: Page,
  options: { issue?: boolean } = {},
): Promise<RenownVisit[]> {
  const visits: RenownVisit[] = [];
  await page.route(`${FAKE_RENOWN_URL}/**`, async (route) => {
    const url = new URL(route.request().url());
    const visit = {
      appDid: url.searchParams.get("connect") ?? "",
      returnUrl: new URL(url.searchParams.get("returnUrl") ?? ""),
    };
    visits.push(visit);
    const userDid =
      options.issue === false ? TEST_DID : await issueCredential(visit.appDid);
    const back = new URL(visit.returnUrl);
    back.searchParams.set("user", userDid);
    await route.fulfill({ status: 302, headers: { location: back.href } });
  });
  return visits;
}

/** The sign-in dialog. */
export const dialog = (page: Page) => page.locator("dialog#site-login");

/** Opens the dialog from the header and signs in through the fake portal. */
export async function signIn(page: Page, path = "/") {
  await fakeRenownPortal(page);
  await page.goto(path);
  await page.locator(".site-header__login").click();
  await dialog(page).getByRole("button", { name: "Continue with Renown" }).click();
  await expect(
    dialog(page).getByRole("heading", { name: "Where does your Sektar run?" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((c) => c.name === SESSION_COOKIE),
    )
    .toBe(true);
}
