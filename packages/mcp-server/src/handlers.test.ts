import { test } from "node:test";
import assert from "node:assert/strict";
import type { BullhornConfig } from "@bullhorn/core";
import { handlePost, handlePostThread } from "./handlers.js";

const DRY: BullhornConfig = { dryRun: true };

test("handlePost renders a dry-run result with structured content", async () => {
  const result = await handlePost(DRY, "x", "hello world");

  assert.equal(result.isError, undefined);
  assert.match(result.content[0]!.text, /\[DRY RUN\] Would post/);
  assert.equal(result.structuredContent!["dryRun"], true);
  assert.equal(result.structuredContent!["text"], "hello world");
  assert.equal(result.structuredContent!["id"], null);
  assert.equal(result.structuredContent!["platform"], "x");
});

test("handlePost returns a tool error for invalid text", async () => {
  const result = await handlePost(DRY, "x", "x".repeat(281));

  assert.equal(result.isError, true);
  assert.match(result.content[0]!.text, /Validation error.*limit is 280/);
});

test("handlePost returns a tool error for an unknown platform", async () => {
  const result = await handlePost(DRY, "mastodon", "hello");

  assert.equal(result.isError, true);
  assert.match(result.content[0]!.text, /Unknown platform "mastodon"/);
});

test("handlePostThread renders a numbered dry-run thread", async () => {
  const result = await handlePostThread(DRY, "x", ["one", "two"]);

  assert.equal(result.isError, undefined);
  assert.match(result.content[0]!.text, /2-post thread/);
  assert.match(result.content[0]!.text, /1\. \[DRY RUN\]/);
  assert.match(result.content[0]!.text, /2\. \[DRY RUN\]/);
  assert.equal((result.structuredContent!["posts"] as unknown[]).length, 2);
});

test("handlePostThread errors (without posting) if any post is invalid", async () => {
  let called = false;
  const fetchSpy = (async () => {
    called = true;
    return new Response(JSON.stringify({ data: { id: "x" } }), { status: 201 });
  }) as unknown as typeof fetch;
  const live: BullhornConfig = {
    dryRun: false,
    credentials: {
      x: { apiKey: "a", apiSecret: "b", accessToken: "c", accessSecret: "d" },
    },
  };

  const result = await handlePostThread(live, "x", ["ok", "x".repeat(281)], {
    fetch: fetchSpy,
  });
  assert.equal(result.isError, true);
  assert.equal(called, false);
});
