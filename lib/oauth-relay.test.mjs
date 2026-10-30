// node --test lib/*.test.mjs (node 24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  callbackShapeError,
  clearHostCache,
  hostAccepted,
  relay,
  relayOptionsFromEnv,
  targetFromState,
} from "./oauth-relay.ts";

const CALLBACK = "/api/@powerhousedao/workflow/oauth/callback";
const RANDOM = "a1B2-c3_D4";
const stateFor = (url) => `${RANDOM}.${Buffer.from(url).toString("base64url")}`;

function lookup(answer, calls = []) {
  return async (url, init) => {
    calls.push(JSON.parse(init.body).variables.host);
    if (answer instanceof Error) throw answer;
    return new Response(JSON.stringify({ data: { vetraEnvironmentHostKnown: answer } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

const options = (fetch, extra = {}) => ({
  hostSuffixes: ["vetra.io"],
  lookupUrl: "https://switchboard.vetra.io/graphql",
  fetch,
  ...extra,
});

beforeEach(() => clearHostCache());

test("forwards a vetra.io environment's callback with everything Google sent", async () => {
  const state = stateFor(`https://tall-duck-ab12.vetra.io${CALLBACK}`);
  const params = new URLSearchParams({ code: "4/0Ab", state, scope: "email openid" });
  const calls = [];
  const result = await relay(params, options(lookup(false, calls)));
  assert.equal(result.ok, true);
  const next = new URL(result.location);
  assert.equal(next.origin + next.pathname, `https://tall-duck-ab12.vetra.io${CALLBACK}`);
  assert.equal(next.searchParams.get("code"), "4/0Ab");
  assert.equal(next.searchParams.get("state"), state);
  assert.equal(next.searchParams.get("scope"), "email openid");
  assert.deepEqual(calls, [], "a vetra.io host needs no lookup");
});

test("forwards Google's error too", async () => {
  const state = stateFor(`https://tall-duck-ab12.vetra.io${CALLBACK}`);
  const result = await relay(new URLSearchParams({ error: "access_denied", state }), options(lookup(false)));
  assert.equal(result.ok, true);
  assert.equal(new URL(result.location).searchParams.get("error"), "access_denied");
});

test("asks Vetra about a custom domain and caches the answer", async () => {
  const state = stateFor(`https://sektar.acme.example${CALLBACK}`);
  const calls = [];
  const fetch = lookup(true, calls);
  assert.equal((await relay(new URLSearchParams({ code: "c", state }), options(fetch))).ok, true);
  assert.equal((await relay(new URLSearchParams({ code: "c", state }), options(fetch))).ok, true);
  assert.deepEqual(calls, ["sektar.acme.example"]);
});

test("refuses a host Vetra does not know", async () => {
  const state = stateFor(`https://evil.example${CALLBACK}`);
  const result = await relay(new URLSearchParams({ code: "c", state }), options(lookup(false)));
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("fails closed when the lookup fails or is switched off", async () => {
  const state = stateFor(`https://sektar.acme.example${CALLBACK}`);
  const params = new URLSearchParams({ code: "c", state });
  assert.equal((await relay(params, options(lookup(new Error("down"))))).ok, false);
  clearHostCache();
  assert.equal((await relay(params, options(lookup(true), { lookupUrl: null }))).ok, false);
});

test("a suffix must match whole labels", async () => {
  const state = stateFor(`https://evilvetra.io${CALLBACK}`);
  const result = await relay(new URLSearchParams({ code: "c", state }), options(lookup(false)));
  assert.equal(result.ok, false);
});

test("refuses states that name no environment", async () => {
  for (const state of ["", "nodot", ".abc", "a b.abc", `${RANDOM}.not base64!`]) {
    const result = await relay(new URLSearchParams(state ? { code: "c", state } : { code: "c" }), options(lookup(true)));
    assert.equal(result.ok, false, `state ${JSON.stringify(state)}`);
  }
  assert.equal(targetFromState(`${RANDOM}.${Buffer.from("not a url").toString("base64url")}`), null);
});

test("a target must look like a workflow callback", () => {
  const bad = [
    `http://tall-duck-ab12.vetra.io${CALLBACK}`,
    `https://user:pw@tall-duck-ab12.vetra.io${CALLBACK}`,
    `https://tall-duck-ab12.vetra.io${CALLBACK}?x=1`,
    `https://tall-duck-ab12.vetra.io${CALLBACK}#x`,
    `https://tall-duck-ab12.vetra.io:8443${CALLBACK}`,
    "https://tall-duck-ab12.vetra.io/somewhere/else",
  ];
  for (const url of bad) assert.notEqual(callbackShapeError(new URL(url)), null, url);
  assert.equal(callbackShapeError(new URL(`https://tall-duck-ab12.vetra.io${CALLBACK}`)), null);
});

test("says which hosts it relays for", async () => {
  assert.equal(await hostAccepted("tall-duck-ab12.vetra.io", options(lookup(false))), true);
  assert.equal(await hostAccepted("TALL-DUCK-AB12.vetra.io", options(lookup(false))), true);
  assert.equal(await hostAccepted("sektar.acme.example", options(lookup(true))), true);
  clearHostCache();
  assert.equal(await hostAccepted("app.marit.studio", options(lookup(false))), false);
  for (const bad of ["", "a b.vetra.io", "x.vetra.io/path", "x.vetra.io:8443", "u@x.vetra.io"]) {
    assert.equal(await hostAccepted(bad, options(lookup(true))), false, bad);
  }
});

test("reads its settings from the environment", () => {
  assert.deepEqual(relayOptionsFromEnv({}), {
    hostSuffixes: ["vetra.io"],
    lookupUrl: "https://switchboard.vetra.io/graphql",
  });
  assert.deepEqual(
    relayOptionsFromEnv({ OAUTH_RELAY_HOST_SUFFIXES: " .Staging.vetra.io , vetra.io", OAUTH_RELAY_LOOKUP_URL: "" }),
    { hostSuffixes: ["staging.vetra.io", "vetra.io"], lookupUrl: null },
  );
});
