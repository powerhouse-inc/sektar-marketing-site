import { broker, brokerOptionsFromEnv } from "@/lib/oauth-broker";

const HEADERS = { "cache-control": "no-store", pragma: "no-cache" };

/* The token endpoint relayed sign-ins use (lib/oauth-broker.ts): a form post,
   as to Google's own. Called by Sektar environments, server to server. */
export async function POST(request: Request) {
  const options = brokerOptionsFromEnv();
  if (!options) {
    return Response.json(
      { error: "temporarily_unavailable", error_description: "The broker is not configured" },
      { status: 503, headers: HEADERS },
    );
  }
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/x-www-form-urlencoded")) {
    return Response.json(
      { error: "invalid_request", error_description: "Send a form-encoded body" },
      { status: 400, headers: HEADERS },
    );
  }
  const form = new URLSearchParams(await request.text());
  const result = await broker(form, options);
  return Response.json(result.body, { status: result.status, headers: HEADERS });
}
