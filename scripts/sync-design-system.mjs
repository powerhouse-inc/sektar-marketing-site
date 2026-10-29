// Vendors the Sektar design system into this site, unmodified.
//
//   node scripts/sync-design-system.mjs [path/to/sektar-design-elements/design-system]
//
// - CSS layers + site.css   -> public/sk/css/         (byte for byte; served as-is so
//                                                      their relative url()s keep working)
// - the assets the page uses -> public/sk/assets/      (scanned from site.html and the CSS)
// - site.html               -> content/site.html      (vendored as is) and
//                              content/sections/*.html (the parts the page renders,
//                                                      asset paths pointed at /sk)
// - .doc-browser* rules     -> public/sk/css/doc-browser.css (extracted from docs.css,
//                                                      which is documentation-only)
// - provenance              -> public/sk/VERSION.json (source commit, dirty flag, hashes)
//
// Re-run after every design-system change, then `pnpm build`. It fails when
// site.html loses a section the page renders, so a broken sync never ships.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const source = resolve(
  process.argv[2] ?? join(root, "..", "sektar-design-elements", "design-system"),
);
if (!existsSync(join(source, "site.html"))) {
  console.error(`No site.html in ${source}. Pass the design-system folder.`);
  process.exit(1);
}

const CSS = ["sektar.css", "fonts.css", "tokens.css", "base.css", "components.css", "utilities.css", "site.css"];
const out = join(root, "public", "sk");
const content = join(root, "content");

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "css"), { recursive: true });
mkdirSync(content, { recursive: true });

const files = {};
function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  files[relative(root, to).replaceAll("\\", "/")] = createHash("sha256")
    .update(readFileSync(to))
    .digest("hex")
    .slice(0, 16);
}

for (const name of CSS) copy(join(source, "css", name), join(out, "css", name));
copy(join(source, "site.html"), join(content, "site.html"));

// The page's sections. Left out: the prototype bar, the prototype notes and
// js/site.js (components/site-controller.tsx replaces it, on the Renown SDK).
function between(text, start, end, name) {
  const from = text.indexOf(start);
  if (from < 0) fail(`site.html: the ${name} (${start}) is missing.`);
  const to = text.indexOf(end, from + start.length);
  if (to < 0) fail(`site.html: the ${name} has no ${end}.`);
  return text.slice(from, to + end.length);
}
function fail(message) {
  console.error(message);
  process.exit(1);
}
const vendorPaths = (text) => text.replace(/\b(src|href)="assets\//g, '$1="/sk/assets/');
{
  const html = readFileSync(join(source, "site.html"), "utf8");
  const bodyTag = html.indexOf("<body");
  const body = html.slice(html.indexOf(">", bodyTag) + 1);
  // Everything before the site header: the skip link and the sprites. Their
  // comments contain literal <svg> markup, so they are not cut out one by one.
  const headerAt = body.indexOf('<header class="site-header"');
  if (headerAt < 0) fail("site.html: the site header is missing.");
  const preamble = body
    .slice(0, headerAt)
    .replace(/<header class="sk-topbar doc-topbar"[\s\S]*?<\/header>/, "");
  if (!preamble.includes('id="sektar-symbol"') || !preamble.includes('id="i-arrow-right"')) {
    fail("site.html: the icon and brand-mark sprites are missing before the header.");
  }
  const sections = {
    preamble,
    header: vendorPaths(between(body, '<header class="site-header"', "</header>", "site header")),
    main: vendorPaths(between(body, '<main id="top"', "</main>", "main content")),
    footer: vendorPaths(between(body, '<footer class="site-footer"', "</footer>", "footer")),
    dialog: vendorPaths(
      between(body, '<dialog class="site-dialog"', "</dialog>", "sign-in dialog")
        // Only the file:// prototype needs this warning.
        .replace(/<div class="sk-alert sk-alert--warning" data-site-filewarn[\s\S]*?<\/div><\/div>/, ""),
    ),
  };
  // The page's title and description, for the site's metadata (app/layout.tsx).
  const decode = (text) =>
    text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1]?.trim();
  if (!title || !description) fail("site.html: the <title> or the meta description is missing.");
  rmSync(join(content, "sections"), { recursive: true, force: true });
  mkdirSync(join(content, "sections"), { recursive: true });
  writeFileSync(
    join(content, "sections", "meta.json"),
    JSON.stringify({ title: decode(title), description: decode(description) }, null, 2) + "\n",
  );
  for (const [name, text] of Object.entries(sections)) {
    writeFileSync(join(content, "sections", `${name}.html`), text.trim() + "\n");
  }
}

// Assets: every `assets/...` the page or the shipped CSS refers to, plus the fonts.
const html = readFileSync(join(source, "site.html"), "utf8");
const css = CSS.map((name) => readFileSync(join(source, "css", name), "utf8")).join("\n");
const referenced = new Set([
  ...[...html.matchAll(/assets\/[A-Za-z0-9_.\/\[\],-]+\.(svg|jpe?g|png|webp|ttf|woff2?)/g)].map((m) => m[0]),
  ...[...css.matchAll(/\.\.\/(assets\/[^"')]+)/g)].map((m) => m[1]),
]);
for (const font of readdirSync(join(source, "assets", "fonts"))) referenced.add(`assets/fonts/${font}`);
for (const asset of referenced) {
  const from = join(source, asset);
  if (!existsSync(from)) {
    console.error(`site.html or the CSS refers to ${asset}, which the design system does not have.`);
    process.exit(1);
  }
  copy(from, join(out, asset));
}

// The hero's browser frame lives in docs.css (documentation-only). Ship only its rules.
const docs = readFileSync(join(source, "css", "docs.css"), "utf8");
const blocks = [];
const rule = /([^{}]+)\{([^{}]*)\}/g;
for (const [, selector, body] of docs.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(rule)) {
  if (/\.doc-browser/.test(selector)) blocks.push(`${selector.trim()} {${body}}`);
}
if (blocks.length === 0) {
  console.error("docs.css has no .doc-browser rules any more: remove doc-browser.css from the layout.");
  process.exit(1);
}
writeFileSync(
  join(out, "css", "doc-browser.css"),
  `/* Extracted by scripts/sync-design-system.mjs from the design system's docs.css,\n   which is documentation-only. Drop this file once .doc-browser ships in components.css. */\n${blocks.join("\n")}\n`,
);
files["public/sk/css/doc-browser.css"] = "extracted";

// Provenance: which design system this is, and whether it was committed.
function git(...args) {
  try {
    return execFileSync("git", ["-C", source, ...args], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}
const version = {
  source: "sektar-design-elements/design-system",
  commit: git("rev-parse", "--short", "HEAD"),
  dirty: (git("status", "--porcelain", "--", ".") ?? "") !== "",
  syncedAt: new Date().toISOString(),
  files,
};
writeFileSync(join(out, "VERSION.json"), JSON.stringify(version, null, 2) + "\n");

console.log(
  `Synced ${Object.keys(files).length} files from ${version.commit}${version.dirty ? " (uncommitted changes)" : ""}.`,
);
