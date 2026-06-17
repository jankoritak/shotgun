import { test } from "node:test";
import assert from "node:assert/strict";
import { XClient } from "@shotgun/core";
import type { ShotgunConfig } from "@shotgun/core";
import { handlePostTweet, handlePostThread } from "./handlers.js";

const DRY: ShotgunConfig = { dryRun: true };

test("handlePostTweet renders a dry-run result with structured content", async () => {
  const client = new XClient(DRY);
  const result = await handlePostTweet(client, "hello world");

  assert.equal(result.isError, undefined);
  assert.match(result.content[0]!.text, /\[DRY RUN\] Would post/);
  assert.equal(result.structuredContent!["dryRun"], true);
  assert.equal(result.structuredContent!["text"], "hello world");
  assert.equal(result.structuredContent!["id"], null);
});

test("handlePostTweet returns a tool error for invalid text", async () => {
  const client = new XClient(DRY);
  const result = await handlePostTweet(client, "x".repeat(281));

  assert.equal(result.isError, true);
  assert.match(result.content[0]!.text, /Validation error.*limit is 280/);
});

test("handlePostThread renders a numbered dry-run thread", async () => {
  const client = new XClient(DRY);
  const result = await handlePostThread(client, ["one", "two"]);

  assert.equal(result.isError, undefined);
  assert.match(result.content[0]!.text, /2-tweet thread/);
  assert.match(result.content[0]!.text, /1\. \[DRY RUN\]/);
  assert.match(result.content[0]!.text, /2\. \[DRY RUN\]/);
  assert.equal(
    (result.structuredContent!["tweets"] as unknown[]).length,
    2,
  );
});

test("handlePostThread errors (without posting) if any tweet is invalid", async () => {
  let called = false;
  const fetchSpy = (async () => {
    called = true;
    return new Response(JSON.stringify({ data: { id: "x" } }), { status: 201 });
  }) as unknown as typeof fetch;
  const live: ShotgunConfig = {
    dryRun: false,
    credentials: { apiKey: "a", apiSecret: "b", accessToken: "c", accessSecret: "d" },
  };
  const client = new XClient(live, { fetch: fetchSpy });

  const result = await handlePostThread(client, ["ok", "x".repeat(281)]);
  assert.equal(result.isError, true);
  assert.equal(called, false);
});
