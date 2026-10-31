import type { RenownAuthAsync } from "@powerhousedao/reactor-browser/renown";

/** The signed-in person, as the site shows them. */
export type SiteUser = { did: string; name: string; initials: string; image?: string };

function shortDid(did: string) {
  const tail = did.split(":").pop() ?? did;
  return `${tail.slice(0, 6)}…${tail.slice(-4)}`;
}

function initials(name: string) {
  const parts = name.replace(/^@/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0] ?? "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export function userOf(auth: RenownAuthAsync): SiteUser | null {
  const did = auth.user?.did;
  if (!did) return null;
  const username = auth.user?.profile?.username;
  return {
    did,
    name: username ? `@${username}` : (auth.displayName ?? shortDid(did)),
    // As in the prototype: initials from the username, or "S" for Sektar.
    initials: username ? initials(username) : "S",
    image: auth.avatarUrl ?? auth.user?.profile?.userImage ?? undefined,
  };
}
