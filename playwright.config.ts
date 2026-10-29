import { defineConfig, devices } from "@playwright/test";

/* The e2e stack: one local switchboard (Renown's and the data one at once),
   plus a dev server per login mode. Ports and the database are separate from
   `pnpm switchboard` / `pnpm dev`, so a running dev stack is left alone. */
const SWITCHBOARD_PORT = 4801;
export const SWITCHBOARD_URL = `http://localhost:${SWITCHBOARD_PORT}/graphql`;

const REDIRECT_PORT = 3120;
const EMBEDDED_PORT = 3121;
export const REDIRECT_BASE_URL = `http://localhost:${REDIRECT_PORT}`;
export const EMBEDDED_BASE_URL = `http://localhost:${EMBEDDED_PORT}`;

/* The Renown portal of the redirect-mode server: a fake origin that
   e2e/support/renown.ts intercepts and plays the part of. */
export const FAKE_RENOWN_URL = "http://renown.test";

const appEnv = {
  NEXT_PUBLIC_RENOWN_APP_NAME: "fusion-e2e",
  NEXT_PUBLIC_RENOWN_SWITCHBOARD_URL: SWITCHBOARD_URL,
  NEXT_PUBLIC_SWITCHBOARD_URL: SWITCHBOARD_URL,
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  // One worker: the specs share the switchboard's drive.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "redirect",
      testIgnore: /embedded-login\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: REDIRECT_BASE_URL },
    },
    {
      name: "embedded",
      testMatch: /embedded-login\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: EMBEDDED_BASE_URL },
    },
  ],
  webServer: [
    {
      // Its own directory, so its storage (./e2e/switchboard/.ph) is not the dev
      // switchboard's. Not --db-path: that puts every store in one directory.
      command: `pnpm exec ph-cli switchboard --ignore-local --port ${SWITCHBOARD_PORT}`,
      cwd: "./e2e/switchboard",
      url: SWITCHBOARD_URL,
      stdout: "pipe",
      stderr: "pipe",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: `pnpm exec next dev --port ${REDIRECT_PORT}`,
      url: REDIRECT_BASE_URL,
      env: {
        ...appEnv,
        NEXT_DIST_DIR: ".next-e2e-redirect",
        NEXT_PUBLIC_RENOWN_LOGIN_MODE: "redirect",
        NEXT_PUBLIC_RENOWN_URL: FAKE_RENOWN_URL,
      },
      stdout: "pipe",
      stderr: "pipe",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm exec next dev --port ${EMBEDDED_PORT}`,
      url: EMBEDDED_BASE_URL,
      env: {
        ...appEnv,
        NEXT_DIST_DIR: ".next-e2e-embedded",
        NEXT_PUBLIC_RENOWN_LOGIN_MODE: "embedded",
        NEXT_PUBLIC_RENOWN_MOCK: "1",
      },
      stdout: "pipe",
      stderr: "pipe",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
