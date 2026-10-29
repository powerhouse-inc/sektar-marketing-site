# Subgraph documents

One `<subgraph>.graphql` file per custom subgraph listed in `codegen.ts`, holding
the queries and mutations the app sends to it. `pnpm codegen` writes the typed
SDK to `../gen/<subgraph>.ts`.
