"use client";

import {
  useSwitchboardClient,
  type SubgraphSdkFactory,
} from "@powerhousedao/reactor-browser/graphql-client";

/**
 * A typed SDK for one of the data switchboard's custom subgraphs, bound to the
 * light client: the URL is derived from the client's (`<base>/graphql/<name>`)
 * and the Renown bearer token is added per request. `client.subgraph` keeps
 * one SDK per name and factory, so calling this on every render is cheap.
 *
 * Undefined until the provider has built the client (first browser render):
 * gate requests on it.
 *
 *   // after `pnpm codegen` (see codegen.ts)
 *   import { getSdk } from "@/lib/graphql/gen/my-subgraph";
 *   const sdk = useSubgraphSdk("my-subgraph", getSdk);
 *   const result = await sdk?.MyQuery({ id });
 *
 * Results are not cached and emit no change events; cache them with whatever
 * the app already uses for server state.
 */
export function useSubgraphSdk<TSdk>(
  name: string,
  getSdk: SubgraphSdkFactory<TSdk>,
): TSdk | undefined {
  const client = useSwitchboardClient();
  return client?.subgraph(name, getSdk);
}
