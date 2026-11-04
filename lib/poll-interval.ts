/* A poll interval from a build-time env value: a number of ms, at least
   MIN_POLL_MS, else the default. A bad value must not turn a poll into a tight loop. */
export const DEFAULT_POLL_MS = 10_000;
export const MIN_POLL_MS = 250;

export function pollInterval(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_POLL_MS;
  const value = Number(raw);
  return Number.isFinite(value) && value >= MIN_POLL_MS ? value : DEFAULT_POLL_MS;
}
