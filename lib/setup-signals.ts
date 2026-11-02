/* The Vetra queries behind fetchSetupSignals. A plain module (no aliases) so
   node can test it; the fetch is injectable. */

type Gql<T> = { data?: T; errors?: unknown[] } | null;
type Signals = { databaseReady: boolean; pulling: boolean; starting: boolean };

async function vetraQuery<T>(
  fetcher: typeof fetch,
  url: string,
  bearer: string,
  query: string,
  variables?: object,
): Promise<T | null> {
  const response = await fetcher(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json().catch(() => null)) as Gql<T>;
  if (!response.ok || body?.errors?.length || !body?.data) return null;
  return body.data;
}

export async function querySetupSignals(
  url: string,
  host: string,
  bearer: string,
  fetcher: typeof fetch = fetch,
): Promise<Signals> {
  const none = { databaseReady: false, pulling: false, starting: false };
  try {
    const subdomain = host.split(".")[0];
    const mine = await vetraQuery<{
      myEnvironments?: { subdomain?: string | null; tenantId?: string | null }[];
    }>(fetcher, url, bearer, "query { myEnvironments { id name subdomain tenantId status } }");
    const tenantId = mine?.myEnvironments?.find((e) => e.subdomain === subdomain)?.tenantId;
    if (!tenantId) return none;
    const [pods, events] = await Promise.all([
      vetraQuery<{
        environmentPods?: { name?: string; component?: string; phase?: string; ready?: boolean }[];
      }>(
        fetcher,
        url,
        bearer,
        "query ($t: String!) { environmentPods(tenantId: $t) { name component phase ready restartCount } }",
        { t: tenantId },
      ),
      vetraQuery<{ environmentEvents?: { reason?: string; involvedObject?: string }[] }>(
        fetcher,
        url,
        bearer,
        "query ($t: String!) { environmentEvents(tenantId: $t, limit: 20) { type reason message involvedObject timestamp } }",
        { t: tenantId },
      ),
    ]);
    const podList = pods?.environmentPods ?? [];
    const appNames = podList
      .filter((p) => p.component === "app" && p.name)
      .map((p) => p.name as string);
    const onApp = (object: string): boolean =>
      appNames.length > 0
        ? appNames.some((name) => object === name || object === `Pod/${name}`)
        : object.includes(`powerhouse-${tenantId}-app-`);
    return {
      databaseReady: podList.some((p) => p.component === "database" && p.ready === true),
      starting: podList.some((p) => p.component === "app" && p.phase === "RUNNING"),
      pulling: (events?.environmentEvents ?? []).some(
        (e) => e.reason === "Pulling" && onApp(e.involvedObject ?? ""),
      ),
    };
  } catch {
    return none;
  }
}
