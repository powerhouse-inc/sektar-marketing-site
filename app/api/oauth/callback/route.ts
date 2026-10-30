import { relay, relayOptionsFromEnv } from "@/lib/oauth-relay";

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}

/* The page when there is nowhere to send the browser on to. */
function failurePage(reason: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Sign-in failed</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font:15px system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#fafafa;color:#222}main{max-width:28rem;padding:1.5rem;text-align:center}h1{font-size:1.1rem}</style>
</head><body><main><h1>Sign-in failed</h1><p>${escapeHtml(reason)}</p>
<p>Close this window and start the sign-in again from Sektar.</p></main></body></html>`;
}

/* Google's redirect for relayed sign-ins (lib/oauth-relay.ts): on to the
   environment that started it, or a plain failure page, never elsewhere. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await relay(params, relayOptionsFromEnv());
  if (result.ok) {
    return new Response(null, {
      status: 303,
      headers: {
        location: result.location,
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
      },
    });
  }
  return new Response(failurePage(result.reason), {
    status: result.status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
