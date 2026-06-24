/**
 * The four OAuth 1.0a user-context credentials from the X developer portal.
 * For a single user posting to their own account these are long-lived, so no
 * interactive OAuth dance is needed — ideal for a local CLI/MCP (see PLAN §4).
 *
 * This shape is X-specific; other platforms bring their own credential type.
 */
export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

/**
 * Per-platform credentials, keyed by platform id. Only X exists today; adding a
 * network means adding a key here and an adapter — not reshaping the config.
 */
export interface PlatformCredentials {
  x?: XCredentials;
}

/**
 * Resolved runtime configuration. `dryRun` is the global default; a platform
 * adapter additionally forces dry-run whenever its own credentials are absent.
 */
export interface BullhornConfig {
  /** Credentials per platform; a platform key is present only when complete. */
  credentials?: PlatformCredentials;
  /** When true, post operations render but never call any network's API. */
  dryRun: boolean;
}

/** Result of posting a single item (tweet, toot, skeet, …). */
export interface PostResult {
  /** Id returned by the platform, or `null` in dry-run. */
  id: string | null;
  /** Canonical URL of the post, or `null` in dry-run. */
  url: string | null;
  /** The exact text that was (or would be) posted. */
  text: string;
  /** True when this result was produced without calling the platform. */
  dryRun: boolean;
}

/** Result of posting a thread: one {@link PostResult} per post, in order. */
export interface ThreadPostResult {
  posts: PostResult[];
  dryRun: boolean;
}
