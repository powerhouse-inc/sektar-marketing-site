// node --test lib/*.test.mjs (node 24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { elapsed, newEnvironment } from "./cloud-wait.ts";

const old = { url: "https://kind-lion-rq1xuing.vetra.io", kind: "vetra", status: "READY" };
const made = { url: "https://bright-fawn-e2q702qf.vetra.io/", kind: "vetra", status: "PROVISIONING" };
const home = { url: "https://app.marit.studio", kind: "portle" };

test("a redemption waits for the environment it made, not one the person already had", () => {
  const before = [old.url];
  // Right after redeeming, only the old one is listed: nothing new yet.
  assert.equal(newEnvironment(before, [old]), undefined);
  // The old one is READY first; the new one is still the one picked.
  assert.equal(newEnvironment(before, [old, made]), made);
});

test("compares addresses without their trailing slash", () => {
  assert.equal(newEnvironment([`${old.url}/`], [old]), undefined);
  assert.equal(newEnvironment(["https://bright-fawn-e2q702qf.vetra.io"], [made]), undefined);
});

test("only a cloud environment counts as made by a redemption", () => {
  assert.equal(newEnvironment([], [home]), undefined);
  assert.equal(newEnvironment([], [home, made]), made);
});

test("says how long the wait has taken", () => {
  assert.equal(elapsed(0, 0), "0:00");
  assert.equal(elapsed(0, 65_400), "1:05");
  assert.equal(elapsed(1_000, 0), "0:00");
});
