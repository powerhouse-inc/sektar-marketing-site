import assert from "node:assert/strict";
import test from "node:test";
import { querySetupSignals } from "./setup-signals.ts";

const T = "my-app-x";
function stub({ pods, events }) {
  return async (_url, init) => {
    const q = JSON.parse(init.body).query;
    const data = q.includes("myEnvironments")
      ? { myEnvironments: [{ id: "1", subdomain: "noble-lark", tenantId: T }] }
      : q.includes("environmentPods")
        ? { environmentPods: pods }
        : { environmentEvents: events };
    return { ok: true, json: async () => ({ data }) };
  };
}
const run = (f) => querySetupSignals("http://x", "noble-lark.vetra.io", "b", f);

test("a tenant id containing -app- with Pulling on the database pod is not pulling", async () => {
  const r = await run(
    stub({
      pods: [
        { name: `powerhouse-${T}-database-0`, component: "database", phase: "RUNNING", ready: true },
        { name: `powerhouse-${T}-app-abc`, component: "app", phase: "PENDING", ready: false },
      ],
      events: [{ reason: "Pulling", involvedObject: `Pod/powerhouse-${T}-database-0` }],
    }),
  );
  assert.deepEqual(r, { databaseReady: true, pulling: false, starting: false });
});

test("Pulling on the app pod is pulling", async () => {
  const r = await run(
    stub({
      pods: [{ name: `powerhouse-${T}-app-abc`, component: "app", phase: "PENDING", ready: false }],
      events: [{ reason: "Pulling", involvedObject: `Pod/powerhouse-${T}-app-abc` }],
    }),
  );
  assert.equal(r.pulling, true);
});

test("no app pod listed: falls back to the tenant-anchored name", async () => {
  const events = (o) => [{ reason: "Pulling", involvedObject: o }];
  assert.equal((await run(stub({ pods: [], events: events(`Pod/powerhouse-${T}-app-q`) }))).pulling, true);
  assert.equal((await run(stub({ pods: [], events: events(`Pod/other-app-q`) }))).pulling, false);
});

test("fetch rejecting answers all false", async () => {
  const r = await run(async () => {
    throw new Error("down");
  });
  assert.deepEqual(r, { databaseReady: false, pulling: false, starting: false });
});
