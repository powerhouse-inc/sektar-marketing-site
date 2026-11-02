import test from "node:test";
import assert from "node:assert/strict";
import { pollInterval } from "./poll-interval.ts";

test("uses a valid value", () => {
  assert.equal(pollInterval("500"), 500);
  assert.equal(pollInterval("250"), 250);
});
test("falls back to 10 s for anything unusable", () => {
  for (const bad of [undefined, "", "  ", "abc", "0", "-5", "249", "Infinity", "NaN"])
    assert.equal(pollInterval(bad), 10_000, String(bad));
});
