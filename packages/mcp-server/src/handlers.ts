import { createAdapter, PostValidationError } from "@bullhorn/core";
import type { AdapterDeps, BullhornConfig } from "@bullhorn/core";

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
 * Post a single item to a platform. The platform id is resolved to an adapter;
 * an unknown platform or validation failure is returned as a tool error (so the
 * model can react) rather than thrown.
 */
export async function handlePost(
  config: BullhornConfig,
  platform: string,
  text: string,
  deps: AdapterDeps = {},
): Promise<ToolResult> {
  try {
    const adapter = createAdapter(platform, config, deps);
    const result = await adapter.post(text);
    return ok(describe(result.text, result.url, result.dryRun), {
      ...result,
      platform: adapter.id,
    });
  } catch (error) {
    return fail(toMessage(error));
  }
}

/** Post a thread (reply-chain). Same error contract as {@link handlePost}. */
export async function handlePostThread(
  config: BullhornConfig,
  platform: string,
  texts: string[],
  deps: AdapterDeps = {},
): Promise<ToolResult> {
  try {
    const adapter = createAdapter(platform, config, deps);
    const result = await adapter.postThread(texts);
    const lines = result.posts.map(
      (p, i) => `${i + 1}. ${describe(p.text, p.url, p.dryRun)}`,
    );
    const header = result.dryRun
      ? `[DRY RUN] Would post a ${result.posts.length}-post thread:`
      : `Posted a ${result.posts.length}-post thread:`;
    return ok([header, ...lines].join("\n"), {
      posts: result.posts,
      dryRun: result.dryRun,
      platform: adapter.id,
    });
  } catch (error) {
    return fail(toMessage(error));
  }
}

function toMessage(error: unknown): string {
  if (error instanceof PostValidationError) return `Validation error: ${error.message}`;
  if (error instanceof Error) return error.message;
  return String(error);
}
