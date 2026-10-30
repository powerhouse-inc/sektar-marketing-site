// node --test lib/*.test.mjs (node 24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { broker, brokerOptionsFromEnv, upstreamRequest } from "./oauth-broker.ts";

const REDIRECT = "https://sektar.io/api/oauth/callback";
const base = { clientId: "cid", clientSecret: "shh", redirectUri: REDIRECT };

function google(status, body, sent = []) {
  return async (url, init) => {
    sent.push({ url, body: new URLSearchParams(init.body) });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
}

const exchange = (extra = {}) =>
  new URLSearchParams({
    grant_type: "authorization_code",
    client_id: "cid",
    code: "4/0Ab",
    code_verifier: "v".repeat(43),
    redirect_uri: REDIRECT,
    ...extra,
  });

test("a code exchange goes to Google with the secret, and Google's answer comes back", async () => {
  const sent = [];
  const token = { access_token: "ya29", refresh_token: "1//r", expires_in: 3599, token_type: "Bearer" };
  const result = await broker(exchange(), { ...base, fetch: google(200, token, sent) });
  assert.deepEqual(result, { status: 200, body: token });
  assert.equal(sent[0].url, "https://oauth2.googleapis.com/token");
  const body = Object.fromEntries(sent[0].body);
  assert.equal(body.client_secret, "shh");
  assert.equal(body.code_verifier, "v".repeat(43));
  assert.equal(body.redirect_uri, REDIRECT);
});

test("a refresh goes to Google with the secret", async () => {
  const sent = [];
  const form = new URLSearchParams({ grant_type: "refresh_token", client_id: "cid", refresh_token: "1//r" });
  const result = await broker(form, { ...base, fetch: google(200, { access_token: "ya29" }, sent) });
  assert.equal(result.status, 200);
  const body = Object.fromEntries(sent[0].body);
  assert.deepEqual(body, { grant_type: "refresh_token", client_id: "cid", client_secret: "shh", refresh_token: "1//r" });
});

test("Google's errors pass through unchanged", async () => {
  const result = await broker(exchange(), { ...base, fetch: google(400, { error: "invalid_grant" }) });
  assert.deepEqual(result, { status: 400, body: { error: "invalid_grant" } });
});

test("refuses what would let a stray code or another client through", () => {
  const cases = [
    [exchange({ client_id: "other" }), "invalid_client"],
    [exchange({ code_verifier: "" }), "invalid_request"],
    [exchange({ redirect_uri: "https://evil.example/cb" }), "invalid_grant"],
    [new URLSearchParams({ grant_type: "refresh_token", client_id: "cid" }), "invalid_request"],
    [new URLSearchParams({ grant_type: "client_credentials", client_id: "cid" }), "unsupported_grant_type"],
  ];
  for (const [form, error] of cases) {
    const result = upstreamRequest(form, base);
    assert.ok(!(result instanceof URLSearchParams), error);
    assert.equal(result.body.error, error);
    assert.equal(JSON.stringify(result).includes("shh"), false, "the secret is never in an answer");
  }
});

test("an unreachable or garbled Google is a 502", async () => {
  const down = async () => {
    throw new Error("ECONNRESET");
  };
  assert.equal((await broker(exchange(), { ...base, fetch: down })).status, 502);
  assert.equal((await broker(exchange(), { ...base, fetch: google(200, "<html>") })).status, 502);
});

test("is unconfigured without both client settings", () => {
  assert.equal(brokerOptionsFromEnv({ SEKTAR_GOOGLE_CLIENT_ID: "cid" }), null);
  assert.deepEqual(brokerOptionsFromEnv({ SEKTAR_GOOGLE_CLIENT_ID: "cid", SEKTAR_GOOGLE_CLIENT_SECRET: "shh" }), base);
});
