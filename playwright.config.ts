import { defineConfig, devices } from "@playwright/test";

/* The e2e stack: a local switchboard with the Renown package, standing in for
   Renown's switchboard (it stores and serves the sign-in credentials), and the
   site's dev server, whose Renown portal is a fake origin that
   e2e/support/renown.ts intercepts and plays the part of. */
const SWITCHBOARD_PORT = 4811;
export const SWITCHBOARD_URL = `http://localhost:${SWITCHBOARD_PORT}/graphql`;

const SITE_PORT = 3140;
export const SITE_URL = `http://localhost:${SITE_PORT}`;
export const FAKE_RENOWN_URL = "http://renown.test";
/* Must match NEXT_PUBLIC_RENOWN_APP_NAME below: the credential names the app. */
export const E2E_APP_NAME = "sektar-site-e2e";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  // One worker: the specs share the switchboard and the test account.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: SITE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Its own directory, so its storage (./e2e/switchboard/.ph) is its own.
      // Not --db-path: that puts every store in one directory.
      command: `pnpm exec ph-cli switchboard --ignore-local --port ${SWITCHBOARD_PORT}`,
      cwd: "./e2e/switchboard",
      url: SWITCHBOARD_URL,
      stdout: "pipe",
      stderr: "pipe",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: `pnpm exec next dev --port ${SITE_PORT}`,
      url: SITE_URL,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_RENOWN_APP_NAME: E2E_APP_NAME,
        NEXT_PUBLIC_RENOWN_LOGIN_MODE: "redirect",
        NEXT_PUBLIC_RENOWN_URL: FAKE_RENOWN_URL,
        NEXT_PUBLIC_RENOWN_SWITCHBOARD_URL: SWITCHBOARD_URL,
        NEXT_PUBLIC_SITE_URL: SITE_URL,
      },
      stdout: "pipe",
      stderr: "pipe",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
