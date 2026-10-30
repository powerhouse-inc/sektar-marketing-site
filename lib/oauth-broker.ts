/* The token broker: Google's token endpoint, with the publisher's client
   secret added. Sektar environments that sign in through the relay
   (./oauth-relay.ts) hold the client id only; they post the code exchange and
   every later refresh here, as they would to Google, and get Google's answer
   back unchanged. The secret never leaves this site and nothing is stored.

   A code exchange must carry a PKCE verifier and the relay's redirect URI, so
   a code is only redeemable by the environment that started the sign-in. A
   refresh needs the refresh token, which only the connection's environment
   holds. Plain module (no Next.js imports), so node can test it as is. */

export type BrokerOptions = {
  clientId: string;
  clientSecret: string;
  /* The relay's callback: the only redirect URI the client knows. */
  redirectUri: string;
  tokenUrl?: string;
  fetch?: typeof fetch;
};

export type BrokerResult = { status: number; body: Record<string, unknown> };

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const TIMEOUT_MS = 10_000;

export function brokerOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): BrokerOptions | null {
  const clientId = env.SEKTAR_GOOGLE_CLIENT_ID;
  const clientSecret = env.SEKTAR_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const site = (env.NEXT_PUBLIC_SITE_URL ?? "https://sektar.io").replace(/\/+$/, "");
  return {
    clientId,
    clientSecret,
    redirectUri: env.OAUTH_RELAY_REDIRECT_URI || `${site}/api/oauth/callback`,
  };
}

/* An OAuth error in the token endpoint's own shape (RFC 6749 §5.2). */
function oauthError(status: number, error: string, description: string): BrokerResult {
  return { status, body: { error, error_description: description } };
}

/* What to send Google for a request, or the error to answer instead. */
export function upstreamRequest(
  form: URLSearchParams,
  options: BrokerOptions,
): URLSearchParams | BrokerResult {
  if (form.get("client_id") !== options.clientId) {
    return oauthError(401, "invalid_client", "Unknown client");
  }
  const grant = form.get("grant_type");
  const upstream = new URLSearchParams({
    grant_type: grant ?? "",
    client_id: options.clientId,
    client_secret: options.clientSecret,
  });
  if (grant === "authorization_code") {
    const code = form.get("code");
    const verifier = form.get("code_verifier");
    if (!code || !verifier) {
      return oauthError(400, "invalid_request", "A code exchange needs code and code_verifier");
    }
    if (form.get("redirect_uri") !== options.redirectUri) {
      return oauthError(400, "invalid_grant", "The redirect URI is not the relay's");
    }
    upstream.set("code", code);
    upstream.set("code_verifier", verifier);
    upstream.set("redirect_uri", options.redirectUri);
    return upstream;
  }
  if (grant === "refresh_token") {
    const token = form.get("refresh_token");
    if (!token) return oauthError(400, "invalid_request", "A refresh needs refresh_token");
    upstream.set("refresh_token", token);
    const scope = form.get("scope");
    if (scope) upstream.set("scope", scope);
    return upstream;
  }
  return oauthError(400, "unsupported_grant_type", "Only authorization_code and refresh_token");
}

export async function broker(form: URLSearchParams, options: BrokerOptions): Promise<BrokerResult> {
  const upstream = upstreamRequest(form, options);
  if (!(upstream instanceof URLSearchParams)) return upstream;
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(options.tokenUrl ?? GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: upstream,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return oauthError(502, "temporarily_unavailable", "Google did not answer");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return oauthError(502, "temporarily_unavailable", "Google sent no JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return oauthError(502, "temporarily_unavailable", "Google sent no JSON object");
  }
  return { status: response.status, body: body as Record<string, unknown> };
}
