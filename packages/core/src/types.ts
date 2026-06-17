/**
 * The four OAuth 1.0a user-context credentials from the X developer portal.
 * For a single user posting to their own account these are long-lived, so no
 * interactive OAuth dance is needed — ideal for a local CLI/MCP (see PLAN §4).
 */
export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

/**
 * Resolved runtime configuration. `dryRun` is true whenever we must not call X
 * — either explicitly requested or because credentials are absent.
 */
export interface ShotgunConfig {
  /** Present only when all four credentials were supplied. */
  credentials?: XCredentials;
  /** When true, post operations render but never call the X API. */
  dryRun: boolean;
}

/** The maximum length of a single tweet, in characters. */
export const TWEET_MAX_LENGTH = 280;

/** Result of posting a single tweet. */
export interface PostResult {
  /** Tweet id returned by X, or `null` in dry-run. */
  id: string | null;
  /** Canonical URL of the tweet, or `null` in dry-run. */
  url: string | null;
  /** The exact text that was (or would be) posted. */
  text: string;
  /** True when this result was produced without calling X. */
  dryRun: boolean;
}

/** Result of posting a thread: one {@link PostResult} per tweet, in order. */
export interface ThreadPostResult {
  tweets: PostResult[];
  dryRun: boolean;
}
