import type { PostResult, ThreadPostResult } from "./types.js";

/**
 * Thrown when text fails a platform's pre-flight checks before any network
 * call (empty, over the platform's length limit, unknown platform, …).
 */
export class PostValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostValidationError";
  }
}

/**
 * The single seam every platform implements. The MCP server and slash commands
 * talk only to this interface — never to a network's client directly — so a new
 * platform is a new adapter, not a change to callers. (X is the first adapter.)
 */
export interface PlatformAdapter {
  /** Stable platform id used in tool params and config, e.g. "x". */
  readonly id: string;
  /** Human-readable platform name, e.g. "X (Twitter)". */
  readonly name: string;
  /** Maximum length of a single post, in characters. */
  readonly maxLength: number;
  /** True when posts will be rendered but not sent. */
  readonly dryRun: boolean;
  /** Validate a single post's text; throws {@link PostValidationError}. */
  validate(text: string): void;
  /** Post a single item, optionally as a reply (used to chain threads). */
  post(text: string, inReplyToId?: string): Promise<PostResult>;
  /** Post a thread as a reply-chain; validates every post up front. */
  postThread(texts: string[]): Promise<ThreadPostResult>;
}

/** Injected dependencies for an adapter; `fetch` is overridable in tests. */
export interface AdapterDeps {
  fetch?: typeof fetch;
}

/** The platform used when a caller does not specify one. */
export const DEFAULT_PLATFORM = "x";

/** Every platform id with an adapter today. */
export const SUPPORTED_PLATFORMS = ["x"] as const;
