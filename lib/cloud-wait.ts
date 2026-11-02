/* Waiting for a new cloud Sektar: which listed environment a redemption made,
   and how long the wait has taken. Plain module (no Next.js imports, no
   aliases), so node can test it as is. */

export type Listed = { url: string; kind: string };

const bare = (url: string) => url.replace(/\/+$/, "");

/**
 * The environment a redemption made: a cloud one the person did not have
 * before it. Matching on "the first READY one" picked an older cloud Sektar
 * the moment the person had one, and took them there instead of to the new one.
 */
export function newEnvironment<T extends Listed>(before: Iterable<string>, found: T[]): T | undefined {
  const had = new Set([...before].map(bare));
  return found.find((e) => e.kind === "vetra" && !had.has(bare(e.url)));
}

/** Minutes and seconds since `start`, as "1:05". */
export function elapsed(start: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
