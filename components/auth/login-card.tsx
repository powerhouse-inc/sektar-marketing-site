"use client";

import {
  useRenown,
  useRenownAuth,
  useRenownLoginMethods,
} from "@powerhousedao/reactor-browser/renown";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RENOWN_LOGIN_MODE } from "@/lib/config";

/* Redirect mode: no adapters are mounted, so `login()` sends the user to the
   Renown portal, which returns them to this page with `?user=<did>`. Start it
   from this public page only: the portal comes back to the page it left. */
function RedirectLogin() {
  const { login, pending, status } = useRenownAuth();
  // Before Renown has initialized, login() would fall back to the default
  // portal (https://www.renown.id) with no app identity: wait for it.
  const ready = useRenown() !== undefined;
  return (
    <Button
      className="w-full"
      disabled={!ready || pending || status === "loading"}
      onClick={() => login()}
    >
      Continue with Renown
    </Button>
  );
}

/* Embedded mode: one button per login method the mounted adapters offer
   (wallet, email, Google…). The wallet library loads on the first click. */
function EmbeddedLogin() {
  const { login, pending, status } = useRenownAuth();
  const methods = useRenownLoginMethods();
  const ready = useRenown() !== undefined;
  return (
    <div className="flex flex-col gap-2">
      {methods.map((method) => (
        <Button
          key={method.id}
          variant="outline"
          className="w-full"
          disabled={!ready || pending || status === "loading"}
          onClick={() => login(undefined, method.id)}
        >
          {method.label}
        </Button>
      ))}
    </div>
  );
}

export function LoginCard() {
  const { pending, error } = useRenownAuth();
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in with Renown</CardTitle>
        <CardDescription>
          {RENOWN_LOGIN_MODE === "redirect"
            ? "You will be sent to Renown and brought back here."
            : "Sign in without leaving this page."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {RENOWN_LOGIN_MODE === "redirect" ? <RedirectLogin /> : <EmbeddedLogin />}
        {pending ? (
          <p className="text-center text-xs text-muted-foreground">Connecting…</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-center text-xs text-destructive">
            {error.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
