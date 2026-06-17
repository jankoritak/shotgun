import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { XClient, TWEET_MAX_LENGTH } from "@shotgun/core";
import type { ShotgunConfig } from "@shotgun/core";
import { handlePostTweet, handlePostThread } from "./handlers.js";

export const SERVER_NAME = "shotgun";
export const SERVER_VERSION = "0.0.0";

/**
 * Build the Shotgun MCP server for a resolved config. Exposes two write-only
 * tools — the model drafts the text, these post it. Drafting lives in the
 * slash commands, never here.
 */
export function createServer(config: ShotgunConfig): McpServer {
  const client = new XClient(config);
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  const dryNote = config.dryRun
    ? " The server is in DRY-RUN mode: this will render the post but NOT send it to X."
    : "";

  server.registerTool(
    "post_tweet",
    {
      title: "Post Tweet",
      description:
        `Post a single tweet to the user's X (Twitter) account. Only call this ` +
        `after the user has explicitly approved the exact text. Max ` +
        `${TWEET_MAX_LENGTH} characters.${dryNote}`,
      inputSchema: {
        text: z
          .string()
          .min(1)
          .describe("The exact tweet text to post, already approved by the user."),
      },
    },
    async ({ text }) => handlePostTweet(client, text),
  );

  server.registerTool(
    "post_thread",
    {
      title: "Post Thread",
      description:
        `Post a thread of tweets to the user's X account as a reply-chain. ` +
        `Only call this after the user has explicitly approved every tweet. ` +
        `Each tweet max ${TWEET_MAX_LENGTH} characters.${dryNote}`,
      inputSchema: {
        tweets: z
          .array(z.string().min(1))
          .min(1)
          .describe(
            "The ordered tweets of the thread, each already approved by the user.",
          ),
      },
    },
    async ({ tweets }) => handlePostThread(client, tweets),
  );

  return server;
}
