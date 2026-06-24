import { test } from "node:test";
import assert from "node:assert/strict";
import { XAdapter, textLength } from "./x-adapter.js";
import { PostValidationError } from "./platform.js";
import type { BullhornConfig, XCredentials } from "./types.js";

const CREDS: XCredentials = {
  apiKey: "ak",
  apiSecret: "as",
  accessToken: "at",
  accessSecret: "ats",
};

const live = (
  fetchImpl?: typeof fetch,
): [BullhornConfig, { fetch?: typeof fetch }] => [
  { dryRun: false, credentials: { x: CREDS } },
  fetchImpl ? { fetch: fetchImpl } : {},
];

test("textLength counts code points, not UTF-16 units", () => {
  assert.equal(textLength("hello"), 5);
  assert.equal(textLength("🚀🚀"), 2); // 4 UTF-16 units, 2 code points
});

test("validate rejects empty and over-limit text", () => {
  const adapter = new XAdapter({ dryRun: true, credentials: { x: CREDS } });
  assert.throws(() => adapter.validate("   "), PostValidationError);
  assert.throws(() => adapter.validate("x".repeat(281)), PostValidationError);
  assert.doesNotThrow(() => adapter.validate("x".repeat(280)));
});

test("dry-run renders without calling fetch", async () => {
  let called = false;
  const fetchSpy = (async () => {
    called = true;
    return new Response();
  }) as unknown as typeof fetch;

  const adapter = new XAdapter(
    { dryRun: true, credentials: { x: CREDS } },
    { fetch: fetchSpy },
  );
  const result = await adapter.post("hello world");

  assert.equal(called, false);
  assert.deepEqual(result, {
    id: null,
    url: null,
    text: "hello world",
    dryRun: true,
  });
});

test("missing credentials force dry-run even when dryRun is false", async () => {
  const adapter = new XAdapter({ dryRun: false, credentials: {} });
  assert.equal(adapter.dryRun, true);
  const result = await adapter.post("hello");
  assert.equal(result.dryRun, true);
  assert.equal(result.id, null);
});

test("live post sends signed request and returns url", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchSpy = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ data: { id: "123" } }), {
      status: 201,
    });
  }) as unknown as typeof fetch;

  const adapter = new XAdapter(...live(fetchSpy));
  const result = await adapter.post("hello world");

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, "https://api.twitter.com/2/tweets");
  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.match(headers["Authorization"]!, /^OAuth oauth_consumer_key="ak"/);
  assert.equal(headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), {
    text: "hello world",
  });
  assert.deepEqual(result, {
    id: "123",
    url: "https://x.com/i/web/status/123",
    text: "hello world",
    dryRun: false,
  });
});

test("thread chains replies to the previous post id", async () => {
  let counter = 0;
  const bodies: Array<Record<string, unknown>> = [];
  const fetchSpy = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(init.body as string));
    counter += 1;
    return new Response(JSON.stringify({ data: { id: `id${counter}` } }), {
      status: 201,
    });
  }) as unknown as typeof fetch;

  const adapter = new XAdapter(...live(fetchSpy));
  const result = await adapter.postThread(["one", "two", "three"]);

  assert.equal(result.posts.length, 3);
  assert.equal(bodies[0]!["reply"], undefined);
  assert.deepEqual(bodies[1]!["reply"], { in_reply_to_tweet_id: "id1" });
  assert.deepEqual(bodies[2]!["reply"], { in_reply_to_tweet_id: "id2" });
  assert.deepEqual(
    result.posts.map((p) => p.id),
    ["id1", "id2", "id3"],
  );
});

test("thread validates all posts before posting any", async () => {
  let called = false;
  const fetchSpy = (async () => {
    called = true;
    return new Response(JSON.stringify({ data: { id: "x" } }), { status: 201 });
  }) as unknown as typeof fetch;

  const adapter = new XAdapter(...live(fetchSpy));

  await assert.rejects(
    () => adapter.postThread(["ok", "x".repeat(281)]),
    PostValidationError,
  );
  assert.equal(called, false, "no post should send if any is invalid");
});

test("non-2xx response throws with status detail", async () => {
  const fetchSpy = (async () =>
    new Response("rate limited", {
      status: 429,
      statusText: "Too Many Requests",
    })) as unknown as typeof fetch;

  const adapter = new XAdapter(...live(fetchSpy));
  await assert.rejects(() => adapter.post("hi"), /429/);
});
