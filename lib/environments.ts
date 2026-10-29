/* Where a signed-in person's Sektar runs, and how the site gets them there.
   A port of the environment half of the design system's js/site.js; the
   sign-in half is the Renown SDK. Browser-only (localStorage, fetch). */

import {
  CLOUD_URL_TEMPLATE,
  DIRECTORY_URL,
  PORTLE_URL_TEMPLATE,
} from "@/lib/config";

export type EnvKind = "portle" | "vetra";

export type Environment = {
  url: string;
  kind: EnvKind;
  name: string;
  /** Last opened, ms since epoch (remembered environments only). */
  last?: number;
};

const STORE_ENVS = "sektar.site.envs";

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

export function portleUrl(zone: string): string {
  return PORTLE_URL_TEMPLATE.replace("{zone}", zone);
}

export function cloudUrl(name: string): string {
  return CLOUD_URL_TEMPLATE.replace("{name}", name);
}

/** The cloud URL template, split around `{name}`, for the input's affixes. */
export function cloudAffixes(): { prefix: string; suffix: string } {
  const [prefix, suffix = ""] = CLOUD_URL_TEMPLATE.replace(/\/$/, "").split("{name}");
  return { prefix, suffix };
}

/** https anywhere, http on localhost only. Anything else is not a destination. */
export function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ||
      (url.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(url.hostname))
      ? url
      : null;
  } catch {
    return null;
  }
}

/** Cloud when the host matches the cloud template around `{name}`, else a home computer. */
export function kindOf(url: URL): EnvKind {
  const marker = "sektarenvname";
  const [before, after = ""] = new URL(cloudUrl(marker)).hostname.split(marker);
  return url.hostname.startsWith(before) && url.hostname.endsWith(after) ? "vetra" : "portle";
}

/** The address the person typed, as an environment: a full link, a zone or a name. */
export function typedEnv(raw: string, kind: EnvKind): Environment | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    const full = safeUrl(value);
    return full ? { url: full.origin + full.pathname, kind, name: full.hostname } : null;
  }
  const bare = value.replace(/\/+$/, "").toLowerCase();
  if (kind === "portle") {
    const zone = bare.replace(/^app\./, "");
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(zone)) return null;
    return { url: portleUrl(zone), kind: "portle", name: zone };
  }
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(bare)) return null;
  return { url: cloudUrl(bare), kind: "vetra", name: bare };
}

/** A `?env=` deep link, as an environment. */
export function envFromLink(link: string): Environment | null {
  const url = safeUrl(link);
  return url ? { url: url.origin + url.pathname, kind: kindOf(url), name: url.hostname } : null;
}

/* ------------------------------------------------ remembered, per Renown user */

const keyOf = (did: string) => did.toLowerCase();

export function knownEnvs(did: string): Environment[] {
  const all = read<Record<string, Environment[]>>(STORE_ENVS, {});
  return (all[keyOf(did)] ?? []).slice().sort((a, b) => (b.last ?? 0) - (a.last ?? 0));
}

export function remember(did: string, env: Environment) {
  const all = read<Record<string, Environment[]>>(STORE_ENVS, {});
  const list = (all[keyOf(did)] ?? []).filter((e) => e.url !== env.url);
  list.push({ url: env.url, kind: env.kind, name: env.name, last: Date.now() });
  all[keyOf(did)] = list;
  write(STORE_ENVS, all);
}

export function forget(did: string, url: string) {
  const all = read<Record<string, Environment[]>>(STORE_ENVS, {});
  all[keyOf(did)] = (all[keyOf(did)] ?? []).filter((e) => e.url !== url);
  write(STORE_ENVS, all);
}

/** The person's environments from the directory; none until DIRECTORY_URL is set. */
export async function fromDirectory(did: string): Promise<Environment[]> {
  if (!DIRECTORY_URL) return [];
  try {
    const response = await fetch(
      `${DIRECTORY_URL.replace(/\/+$/, "")}/v1/environments?owner=${encodeURIComponent(did)}`,
    );
    if (!response.ok) return [];
    const body = (await response.json()) as {
      environments?: { connectUrl: string; kind: EnvKind; name: string }[];
    };
    return (body.environments ?? [])
      .map((e) => ({ url: e.connectUrl, kind: e.kind, name: e.name }))
      .filter((e) => safeUrl(e.url));
  } catch {
    return [];
  }
}

/**
 * Whether anything answers at `url`. A `no-cors` request resolves on any HTTP
 * response and rejects when nothing is there, within 6 s. Right for Portle,
 * whose relay passes TLS through, so a sleeping computer fails the connection.
 * A cloud load balancer's 502 also "answers": an open question.
 */
export async function answers(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
