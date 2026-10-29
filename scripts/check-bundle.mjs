// Fails when a built client bundle carries code it must not:
// - any mode: the reactor and its storage (PGlite, kysely, node:worker_threads),
//   which the light client is built to stay clear of;
// - redirect mode: wallet libraries, which next.config.ts aliases away.
//
//   node scripts/check-bundle.mjs <distDir> <redirect|embedded>
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const [distDir = ".next", mode = "redirect"] = process.argv.slice(2);

const forbidden = {
  "@electric-sql/pglite": /@electric-sql\/pglite|pglite\.wasm/,
  kysely: /kysely/,
  "node:worker_threads": /node:worker_threads/,
};
if (mode === "redirect") {
  Object.assign(forbidden, {
    "@privy-io": /@privy-io/,
    "@rainbow-me": /@rainbow-me/,
    wagmi: /wagmi/,
    walletconnect: /walletconnect/i,
  });
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(js|mjs|css)$/.test(name)) yield path;
  }
}

const staticDir = join(distDir, "static");
const hits = new Map();
let count = 0;
for (const file of files(staticDir)) {
  count++;
  const text = readFileSync(file, "utf8");
  for (const [label, pattern] of Object.entries(forbidden)) {
    if (pattern.test(text)) {
      hits.set(label, [...(hits.get(label) ?? []), file]);
    }
  }
}

if (count === 0) {
  console.error(`No client files under ${staticDir}: build first.`);
  process.exit(1);
}
if (hits.size > 0) {
  for (const [label, found] of hits) {
    console.error(`${label}: ${found.length} file(s), e.g. ${found[0]}`);
  }
  console.error(`The ${mode} client bundle carries code it must not.`);
  process.exit(1);
}
console.log(`${mode}: ${count} client files, none carrying ${Object.keys(forbidden).join(", ")}.`);
