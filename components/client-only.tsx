"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

/**
 * Renders `children` in the browser only, `fallback` during server rendering.
 *
 * The light reactor client exists only in the browser, so a view that reads
 * documents has nothing to render on the server. Gating it here keeps those
 * hooks out of server rendering, where some 6.2.3 hooks cannot run (no server
 * snapshot), and shows the fallback until the client takes over.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return isClient ? children : fallback;
}
