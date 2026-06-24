import { buildAuthorizationHeader } from "./auth.js";
import { PostValidationError } from "./platform.js";
import type { AdapterDeps, PlatformAdapter } from "./platform.js";
import type {
  BullhornConfig,
  PostResult,
  ThreadPostResult,
  XCredentials,
} from "./types.js";

/** The maximum length of a single tweet, in characters. */
export const X_MAX_LENGTH = 280;

const TWEETS_ENDPOINT = "https://api.twitter.com/2/tweets";

/** Build the public URL for a posted tweet id. */
export function tweetUrl(id: string): string {
  return `https://x.com/i/web/status/${id}`;
}

/**
 * Count a post's length the way X enforces it: by Unicode code points, not
 * UTF-16 units, so astral chars (emoji) count as one.
 * (X's full weighted-length algorithm is richer; this is the v1 guard.)
 */
export function textLength(text: string): number {
  return [...text].length;
}

/**
 * Write-only X (Twitter) adapter. Knows nothing about Claude Code — the model
 * drafts, this posts. In dry-run it renders results without calling X. Forced
 * into dry-run whenever X credentials are absent.
 */
export class XAdapter implements PlatformAdapter {
  readonly id = "x";
  readonly name = "X (Twitter)";
  readonly maxLength = X_MAX_LENGTH;

  private readonly creds?: XCredentials;
  private readonly _dryRun: boolean;
  private readonly fetchImpl: typeof fetch;

  constructor(config: BullhornConfig, deps: AdapterDeps = {}) {
    this.creds = config.credentials?.x;
    this._dryRun = config.dryRun || !this.creds;
    this.fetchImpl = deps.fetch ?? globalThis.fetch;
  }

  get dryRun(): boolean {
    return this._dryRun;
  }

  validate(text: string): void {
    if (text.trim().length === 0) {
      throw new PostValidationError("Post text is empty.");
    }
    const length = textLength(text);
    if (length > this.maxLength) {
      throw new PostValidationError(
        `Post is ${length} characters; the X limit is ${this.maxLength}.`,
      );
    }
  }

  async post(text: string, inReplyToId?: string): Promise<PostResult> {
    this.validate(text);

    if (this._dryRun || !this.creds) {
      return { id: null, url: null, text, dryRun: true };
    }

    const id = await this.send(text, this.creds, inReplyToId);
    return { id, url: tweetUrl(id), text, dryRun: false };
  }

  /**
   * Post a thread: the first post stands alone, each subsequent post replies to
   * the one before it. Validates every post up front so a thread never posts
   * half-way before discovering post 4 is too long.
   */
  async postThread(texts: string[]): Promise<ThreadPostResult> {
    if (texts.length === 0) {
      throw new PostValidationError("Thread has no posts.");
    }
    for (const text of texts) this.validate(text);

    const posts: PostResult[] = [];
    let previousId: string | undefined;
    for (const text of texts) {
      const result = await this.post(text, previousId);
      posts.push(result);
      previousId = result.id ?? previousId;
    }
    return { posts, dryRun: this._dryRun };
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
