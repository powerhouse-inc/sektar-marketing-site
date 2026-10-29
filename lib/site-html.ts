import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cache } from "react";

/**
 * The page is the design system's site prototype, rendered verbatim. Its
 * sections are cut out of site.html by scripts/sync-design-system.mjs into
 * content/sections/, with asset paths pointed at the vendored copy under /sk.
 * A design change is one `pnpm sync:design-system` away, with no hand-ported
 * markup to drift; the sync fails when a section goes missing.
 *
 * Left out by the sync: the prototype bar, the prototype notes and js/site.js.
 * The sign-in and forwarding behaviour lives in components/site-controller.tsx,
 * on the Renown SDK.
 */
const SECTIONS = ["preamble", "header", "main", "footer", "dialog"] as const;

export type SiteHtml = Record<(typeof SECTIONS)[number], string>;

export const loadSiteHtml = cache(
  (): SiteHtml =>
    Object.fromEntries(
      SECTIONS.map((name) => [
        name,
        readFileSync(join(process.cwd(), "content", "sections", `${name}.html`), "utf8"),
      ]),
    ) as SiteHtml,
);

/** The prototype's <title> and meta description, for the page metadata. */
export function loadSiteMeta(): { title: string; description: string } {
  return JSON.parse(
    readFileSync(join(process.cwd(), "content", "sections", "meta.json"), "utf8"),
  ) as { title: string; description: string };
}
