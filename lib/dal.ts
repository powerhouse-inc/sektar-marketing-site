import {
  RENOWN_SESSION_COOKIE,
  verifyRenownSession,
  type RenownSession,
} from "@renown/sdk/node";
import { cookies } from "next/headers";
import { cache } from "react";
import { RENOWN_SWITCHBOARD_URL } from "@/lib/config";

/**
 * Data Access Layer: the server-side session check, memoized per request.
 *
 * Verifies the session cookie's JWT signature and expiry, and merges the
 * cookie's display hint. Pass `verifyCredential: true` (one switchboard call)
 * where a revoked credential must be refused, e.g. before a sensitive write.
 */
export const verifySession = cache(async (): Promise<RenownSession | null> => {
  const cookie = (await cookies()).get(RENOWN_SESSION_COOKIE)?.value;
  if (!cookie) return null;
  const session = await verifyRenownSession(cookie, {
    switchboardUrl: RENOWN_SWITCHBOARD_URL,
  });
  return session ?? null;
});
