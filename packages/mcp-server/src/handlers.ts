import { TweetValidationError } from "@shotgun/core";
import type { XClient } from "@shotgun/core";

/**
 * Minimal shape of an MCP tool result — a subset of the SDK's CallToolResult.
 * Kept local so the handlers stay framework-light and trivially unit-testable.
 */
export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  /** SDK's CallToolResult permits arbitrary extra fields. */
  [key: string]: unknown;
}

function ok(
  summary: string,
  structured: Record<string, unknown>,
): ToolResult {
  return { content: [{ type: "text", text: summary }], structuredContent: structured };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Human-readable one-liner for a post result. */
function describe(text: string, url: string | null, dryRun: boolean): string {
  if (dryRun) return `[DRY RUN] Would post: ${JSON.stringify(text)}`;
  return `Posted: ${url}`;
}

/**
 * Post a single tweet. Validation failures are returned as tool errors (so the
 * model can react) rather than thrown; unexpected failures still surface as
 * errors with their message.
 */
export async function handlePostTweet(
  client: XClient,
  text: string,
): Promise<ToolResult> {
  try {
    const result = await client.postTweet(text);
    return ok(describe(result.text, result.url, result.dryRun), { ...result });
  } catch (error) {
    return fail(toMessage(error));
  }
}

/** Post a thread (reply-chain). Same error contract as {@link handlePostTweet}. */
export async function handlePostThread(
  client: XClient,
  tweets: string[],
): Promise<ToolResult> {
  try {
    const result = await client.postThread(tweets);
    const lines = result.tweets.map(
      (t, i) => `${i + 1}. ${describe(t.text, t.url, t.dryRun)}`,
    );
    const header = result.dryRun
      ? `[DRY RUN] Would post a ${result.tweets.length}-tweet thread:`
      : `Posted a ${result.tweets.length}-tweet thread:`;
    return ok([header, ...lines].join("\n"), {
      tweets: result.tweets,
      dryRun: result.dryRun,
    });
  } catch (error) {
    return fail(toMessage(error));
  }
}

function toMessage(error: unknown): string {
  if (error instanceof TweetValidationError) return `Validation error: ${error.message}`;
  if (error instanceof Error) return error.message;
  return String(error);
}
