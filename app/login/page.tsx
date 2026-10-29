"use client";

import {
  useRenownAuthAsync,
  useRenownSessionSynced,
} from "@powerhousedao/reactor-browser/renown";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { LoginCard } from "@/components/auth/login-card";

/* Only same-app paths are followed after sign-in. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useRenownAuthAsync();
  // Navigate only once the session cookie is written, or the proxy, which
  // reads the cookie, sends the user straight back here.
  const sessionSynced = useRenownSessionSynced();
  const next = safeNext(searchParams.get("next"));

  useEffect(() => {
    if (state === "authenticated" && sessionSynced) {
      router.replace(next);
      router.refresh();
    }
  }, [state, sessionSynced, next, router]);

  return (
    <main className="flex justify-center py-16">
      <LoginCard />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
