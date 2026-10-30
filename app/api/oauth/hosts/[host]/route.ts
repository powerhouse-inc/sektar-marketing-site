import { hostAccepted, relayOptionsFromEnv } from "@/lib/oauth-relay";

/* Whether relayed sign-ins reach this host: a Sektar host asks once at start
   and signs in through the relay only on a yes (lib/oauth-relay.ts). */
export async function GET(_request: Request, ctx: { params: Promise<{ host: string }> }) {
  const { host } = await ctx.params;
  const accepted = await hostAccepted(decodeURIComponent(host), relayOptionsFromEnv());
  return Response.json({ accepted }, { headers: { "cache-control": "no-store" } });
}
