/* The OAuth relay: the one redirect URI registered on the publisher's Google
   app. A Sektar environment starts a sign-in with this site's
   /api/oauth/callback as redirect_uri and its own callback appended to the
   state (`<random>.<base64url(own callback)>`); Google sends the browser here,
   and the relay sends it on, with everything Google sent, to that callback.
   The environment then exchanges the code itself: no code, token or secret is
   kept here. Only hosts Vetra serves are sent on, so the site is no open
   redirect. Plain module (no Next.js imports), so node can test it as is. */

export type RelayOptions = {
  /* Hosts under these domains are Vetra's own and need no lookup. */
  hostSuffixes: string[];
  /* Vetra's GraphQL endpoint answering vetraEnvironmentHostKnown; null skips
     the lookup, so only the suffixes count. */
  lookupUrl: string | null;
  fetch?: typeof fetch;
  now?: () => number;
};

export type RelayResult =
  | { ok: true; location: string }
  | { ok: false; status: number; reason: string };

const CALLBACK_SUFFIX = "/oauth/callback";
const LOOKUP_TIMEOUT_MS = 3_000;
const KNOWN_TTL_MS = 5 * 60_000;
// Short, so a custom domain configured a moment ago works on the next try.
const UNKNOWN_TTL_MS = 60_000;
const CACHE_LIMIT = 1_000;

export function relayOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): RelayOptions {
  const suffixes = (env.OAUTH_RELAY_HOST_SUFFIXES ?? "vetra.io")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
  const lookupUrl =
    env.OAUTH_RELAY_LOOKUP_URL === undefined
      ? "https://switchboard.vetra.io/graphql"
      : env.OAUTH_RELAY_LOOKUP_URL || null;
  return { hostSuffixes: suffixes, lookupUrl };
}

/* The environment's callback the state carries, or null when it names none. */
export function targetFromState(state: string): URL | null {
  const dot = state.indexOf(".");
  if (dot <= 0) return null;
  const random = state.slice(0, dot);
  const encoded = state.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(random) || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    return null;
  }
  try {
    return new URL(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/* What a callback must look like, wherever it is: https, no credentials, no
   query or fragment of its own, and the workflow package's callback path. */
export function callbackShapeError(target: URL): string | null {
  if (target.protocol !== "https:") return "The target is not https";
  if (target.username || target.password) return "The target carries credentials";
  if (target.search || target.hash) return "The target carries a query or fragment";
  if (target.port && target.port !== "443") return "The target names a port";
  if (!target.pathname.endsWith(CALLBACK_SUFFIX)) return "The target is not an OAuth callback";
  return null;
}

function underSuffix(host: string, suffixes: string[]): boolean {
  return suffixes.some((s) => host === s || host.endsWith(`.${s}`));
}

const cache = new Map<string, { known: boolean; until: number }>();

export function clearHostCache(): void {
  cache.clear();
}

/* Asks Vetra whether a host is one of its environments' (a custom domain).
   Any failure is a no: an unanswered lookup never opens the redirect. */
async function hostKnown(host: string, options: RelayOptions): Promise<boolean> {
  if (!options.lookupUrl) return false;
  const now = (options.now ?? Date.now)();
  const hit = cache.get(host);
  if (hit && hit.until > now) return hit.known;
  let known = false;
  try {
    const response = await (options.fetch ?? fetch)(options.lookupUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "query ($host: String!) { vetraEnvironmentHostKnown(host: $host) }",
        variables: { host },
      }),
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        data?: { vetraEnvironmentHostKnown?: unknown };
      };
      known = body.data?.vetraEnvironmentHostKnown === true;
    }
  } catch {
    known = false;
  }
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(host, { known, until: now + (known ? KNOWN_TTL_MS : UNKNOWN_TTL_MS) });
  return known;
}

/* Whether the relay sends sign-ins on to this host. A Sektar host asks once at
   start (GET /api/oauth/hosts/<host>) and only signs in through the relay when
   the answer is yes; anywhere else it keeps its own way of signing in. */
export async function hostAccepted(host: string, options: RelayOptions): Promise<boolean> {
  let name: string;
  try {
    name = new URL(`https://${host}/`).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (name !== host.toLowerCase()) return false;
  return underSuffix(name, options.hostSuffixes) || (await hostKnown(name, options));
}

/* Where the browser goes next: the environment's callback with every
   parameter the provider sent, or why not. */
export async function relay(params: URLSearchParams, options: RelayOptions): Promise<RelayResult> {
  const state = params.get("state");
  if (!state) return { ok: false, status: 400, reason: "The provider sent no state" };
  const target = targetFromState(state);
  if (!target) return { ok: false, status: 400, reason: "The sign-in names no environment" };
  const shape = callbackShapeError(target);
  if (shape) return { ok: false, status: 400, reason: shape };
  const host = target.hostname.toLowerCase();
  const allowed =
    underSuffix(host, options.hostSuffixes) || (await hostKnown(host, options));
  if (!allowed) {
    return { ok: false, status: 400, reason: "The sign-in names an environment Vetra does not serve" };
  }
  const next = new URL(target.href);
  for (const [key, value] of params) next.searchParams.append(key, value);
  return { ok: true, location: next.href };
}
