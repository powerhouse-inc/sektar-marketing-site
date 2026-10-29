import { RENOWN_SESSION_COOKIE, verifyRenownSession } from "@renown/sdk/node";
import { NextResponse, type NextRequest } from "next/server";

/* Paths a signed-out visitor may open. Everything else redirects to /login. */
const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/* Only same-app paths are followed after sign-in; anything else goes home. */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : null;
}

/* Auth gate: verifies the session cookie's JWT signature and expiry, with no
   network call (no switchboard, no revocation check). Pages and lib/dal.ts
   remain the authoritative check. */
export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(RENOWN_SESSION_COOKIE)?.value;
  const session = cookie
    ? await verifyRenownSession(cookie, { verifyCredential: false })
    : undefined;
  const { pathname, search, searchParams } = request.nextUrl;

  if (!session && !isPublicPath(pathname)) {
    const login = new URL("/login", request.url);
    // A redirect sign-in returns with the DID in `?user=`. Keep it, or the
    // login page never sees the sign-in it is meant to complete.
    const user = searchParams.get("user");
    if (user) login.searchParams.set("user", user);
    // Remember where the visitor was going, minus that sign-in param.
    const target = new URL(pathname + search, request.url);
    target.searchParams.delete("user");
    if (pathname !== "/") {
      login.searchParams.set("next", target.pathname + target.search);
    }
    return NextResponse.redirect(login);
  }
  if (session && pathname === "/login") {
    const next = safeNext(searchParams.get("next")) ?? "/";
    return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: skip API routes, Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
