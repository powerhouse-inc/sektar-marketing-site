import type { CodegenConfig } from "@graphql-codegen/cli";
import { config as dotenvConfig } from "dotenv";

/**
 * Typed SDKs for your switchboard's custom subgraphs (`<base>/graphql/<name>`).
 *
 * Documents and drives need no codegen: the light client reads and writes
 * them (`useDocument`, `useDispatch`, `client.request`). Generate an SDK for
 * the subgraphs your own package adds, then bind it with
 * `client.subgraph(name, getSdk)` (see lib/graphql/subgraph.ts): the client
 * derives the URL and adds the Renown bearer token.
 *
 * For each name in SUBGRAPHS:
 *   schema     ${PH_SWITCHBOARD_URL}/<name>   (introspected; the switchboard must run)
 *   documents  lib/graphql/documents/<name>.graphql
 *   output     lib/graphql/gen/<name>.ts      (commit it)
 *
 * Then `pnpm codegen`. CODEGEN_SUBGRAPHS=a,b overrides the list.
 */
const SUBGRAPHS: string[] = [
  // "my-subgraph",
];

dotenvConfig({ path: [".env.local", ".env"], quiet: true });

const base = (
  process.env.PH_SWITCHBOARD_URL ?? "http://localhost:4001/graphql"
).replace(/\/$/, "");

const names = process.env.CODEGEN_SUBGRAPHS
  ? process.env.CODEGEN_SUBGRAPHS.split(",").map((name) => name.trim())
  : SUBGRAPHS;

if (names.length === 0) {
  throw new Error(
    "No subgraphs to generate. Add your subgraph names to SUBGRAPHS in codegen.ts.",
  );
}

const config: CodegenConfig = {
  overwrite: true,
  generates: Object.fromEntries(
    names.map((name) => [
      `lib/graphql/gen/${name}.ts`,
      {
        schema: `${base}/${name}`,
        documents: `lib/graphql/documents/${name}.graphql`,
        // `getSdk(client, withWrapper?)` is exactly the SubgraphSdkFactory
        // `client.subgraph` takes.
        plugins: [
          "typescript",
          "typescript-operations",
          "typescript-graphql-request",
        ],
        config: {
          skipTypename: true,
          maybeValue: "T | null | undefined",
          gqlImport: "graphql-tag#gql",
          scalars: {
            DateTime: "string",
            JSONObject: "Record<string, unknown>",
            PHID: "string",
            OID: "string",
            EthereumAddress: "string",
            EmailAddress: "string",
            URL: "string",
          },
        },
      },
    ]),
  ),
};

export default config;
