import assert from "node:assert/strict";
import test from "node:test";
import { setupSteps } from "./setup-steps.ts";

const none = { redeemed: false, reserved: false, databaseReady: false, pulling: false, starting: false, serving: false };
const sig = (o) => ({ ...none, ...o });
const done = (s) => s.map((x) => x.done);

test("only redeemed: step 1 done, step 2 current", () => {
  const s = setupSteps(sig({ redeemed: true }), null, 100);
  assert.deepEqual(done(s), [true, false, false, false, false, false]);
  assert.equal(s.filter((x) => x.current).length, 1);
  assert.equal(s[1].current, true);
});

test("serving alone completes all with the same doneAt, none current", () => {
  const s = setupSteps(sig({ serving: true }), null, 100);
  assert.ok(s.every((x) => x.done && x.doneAt === 100 && !x.current));
});

test("starting implies earlier steps", () => {
  const s = setupSteps(sig({ starting: true }), null, 5);
  assert.deepEqual(done(s), [true, true, true, true, true, false]);
  assert.equal(s[5].current, true);
});

test("monotonic: previous done stays, doneAt kept", () => {
  const first = setupSteps(sig({ redeemed: true, databaseReady: true }), null, 10);
  const next = setupSteps(sig({ redeemed: true }), first, 99);
  assert.equal(next.find((x) => x.id === "database").done, true);
  assert.equal(next.find((x) => x.id === "database").doneAt, 10);
  assert.equal(next[0].doneAt, 10);
});

test("refused observability still advances to done", () => {
  const s = setupSteps(sig({ redeemed: true, reserved: true, serving: true }), null, 1);
  assert.ok(s.every((x) => x.done));
});

test("labels and subs", () => {
  const s = setupSteps(none, null, 0);
  assert.deepEqual(
    s.map((x) => [x.label, x.sub]),
    [
      ["Invite code accepted", undefined],
      ["Your environment is reserved", "its own address and storage, only yours"],
      ["Database ready", undefined],
      ["Downloading Sektar", "the first start fetches the app"],
      ["Starting Sektar", undefined],
      ["Opening it for you", undefined],
    ],
  );
  assert.equal(s[0].current, true);
});
