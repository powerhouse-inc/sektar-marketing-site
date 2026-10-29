import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The browser bundle must never reach the reactor: its single entry pulls
      // in pg, PGlite and node:worker_threads, and Turbopack fails on the last.
      // Import the subpaths, which are built to stay clear of it.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@powerhousedao/reactor-browser",
              message:
                "Import @powerhousedao/reactor-browser/graphql-client or /renown; the package root pulls the reactor (pg, PGlite) into the bundle.",
            },
            {
              name: "@powerhousedao/reactor",
              message:
                "The reactor is server-side. Talk to the switchboard through @powerhousedao/reactor-browser/graphql-client.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated code and test output.
    "lib/graphql/gen/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
