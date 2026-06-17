import { buildAuthorizationHeader } from "./auth.js";
import { TWEET_MAX_LENGTH } from "./types.js";
import type {
  PostResult,
  ShotgunConfig,
  ThreadPostResult,
  XCredentials,
} from "./types.js";

const TWEETS_ENDPOINT = "https://api.twitter.com/2/tweets";

/** Build the public URL for a posted tweet id. */
export function tweetUrl(id: string): string {
  return `https://x.com/i/web/status/${id}`;
}

/**
 * Count a tweet's length the way the limit is enforced: by Unicode code
 * points, not UTF-16 units, so astral chars (emoji) count as one.
 * (X's full weighted-length algorithm is richer; this is the v1 guard.)
 */
export function tweetLength(text: string): number {
  return [...text].length;
}

/** Thrown when text fails the pre-flight checks before any network call. */
export class TweetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TweetValidationError";
  }
}

/** Validate a single tweet's text; throws {@link TweetValidationError}. */
export function validateTweetText(text: string): void {
  if (text.trim().length === 0) {
    throw new TweetValidationError("Tweet text is empty.");
  }
  const length = tweetLength(text);
  if (length > TWEET_MAX_LENGTH) {
    throw new TweetValidationError(
      `Tweet is ${length} characters; the limit is ${TWEET_MAX_LENGTH}.`,
    );
  }
}

interface XClientDeps {
  /** Override for tests; defaults to global fetch. */
  fetch?: typeof fetch;
}

/**
 * Minimal write-only X API v2 client. Knows nothing about Claude Code — the
 * model drafts, this posts. In dry-run it renders results without calling X.
 */
export class XClient {
  private readonly config: ShotgunConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ShotgunConfig, deps: XClientDeps = {}) {
    this.config = config;
    this.fetchImpl = deps.fetch ?? globalThis.fetch;
  }

  /** True when posts will be rendered but not sent. */
  get dryRun(): boolean {
    return this.config.dryRun;
  }

  /** Post a single tweet, optionally as a reply (used to chain threads). */
  async postTweet(text: string, inReplyToId?: string): Promise<PostResult> {
    validateTweetText(text);

    if (this.config.dryRun || !this.config.credentials) {
      return { id: null, url: null, text, dryRun: true };
    }

    const id = await this.send(text, this.config.credentials, inReplyToId);
    return { id, url: tweetUrl(id), text, dryRun: false };
  }

  /**
   * Post a thread: the first tweet stands alone, each subsequent tweet replies
   * to the one before it. Validates every tweet up front so a thread never
   * posts half-way before discovering tweet 4 is too long.
   */
  async postThread(texts: string[]): Promise<ThreadPostResult> {
    if (texts.length === 0) {
      throw new TweetValidationError("Thread has no tweets.");
    }
    for (const text of texts) validateTweetText(text);

    const results: PostResult[] = [];
    let previousId: string | undefined;
    for (const text of texts) {
      const result = await this.postTweet(text, previousId);
      results.push(result);
      previousId = result.id ?? previousId;
    }
    return { tweets: results, dryRun: this.config.dryRun };
  }

  private async send(
    text: string,
    creds: XCredentials,
    inReplyToId?: string,
  ): Promise<string> {
    const body: Record<string, unknown> = { text };
    if (inReplyToId) {
      body["reply"] = { in_reply_to_tweet_id: inReplyToId };
    }

    const authorization = buildAuthorizationHeader(
      "POST",
      TWEETS_ENDPOINT,
      {},
      creds,
    );

    const response = await this.fetchImpl(TWEETS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `X API responded ${response.status} ${response.statusText}: ${detail}`,
      );
    }

    const payload = (await response.json()) as { data?: { id?: string } };
    const id = payload.data?.id;
    if (!id) {
      throw new Error("X API response did not include a tweet id.");
    }
    return id;
  }
}
