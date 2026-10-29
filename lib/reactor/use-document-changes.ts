"use client";

import { useSwitchboardClient } from "@powerhousedao/reactor-browser/graphql-client";
import { useEffect, useRef } from "react";

/* How long a burst of change events settles before `onChange` runs: long
   enough to collapse the events one job emits, short enough to feel live. */
const SETTLE_MS = 250;

/**
 * Calls `onChange` once per settled burst of changes to documents of `types`.
 *
 * For reads the document hooks don't cover (a list from `client.request`):
 * `useDocument` / `useDocumentSafe` already update themselves. Realtime is an
 * enhancement: if the socket never opens, the list stays as fresh as its last
 * read.
 */
export function useDocumentChanges(
  types: readonly string[],
  onChange: () => void,
): void {
  const client = useSwitchboardClient();
  const latest = useRef(onChange);

  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);

  // Joined, so an inline array literal does not re-subscribe every render.
  const key = types.join(",");

  useEffect(() => {
    if (!client) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(), SETTLE_MS);
    };
    const unsubscribes = key
      .split(",")
      .map((type) => client.subscribe({ type }, settle));
    return () => {
      clearTimeout(timer);
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [client, key]);
}
