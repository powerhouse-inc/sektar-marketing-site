"use client";

import { useRenownAuth } from "@powerhousedao/reactor-browser/renown";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/* Header slot: who is signed in, and the way out. */
export function UserMenu() {
  const { user, displayName, displayAddress, logout } = useRenownAuth();
  const router = useRouter();

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground" data-testid="user-name">
        {displayName ?? displayAddress ?? "Renown user"}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          // Clears the Renown session; the cookie sync DELETEs the cookie.
          await logout();
          router.replace("/login");
          router.refresh();
        }}
      >
        <LogOut />
        Log out
      </Button>
    </div>
  );
}
