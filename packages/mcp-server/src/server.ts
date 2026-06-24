import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_PLATFORM, SUPPORTED_PLATFORMS, X_MAX_LENGTH } from "@bullhorn/core";
import type { BullhornConfig } from "@bullhorn/core";
import { handlePost, handlePostThread } from "./handlers.js";

export const SERVER_NAME = "bullhorn";
export const SERVER_VERSION = "0.1.1";

const PLATFORM_LIST = SUPPORTED_PLATFORMS.join(", ");

const platformParam = z
  .enum(SUPPORTED_PLATFORMS)
  .default(DEFAULT_PLATFORM)
  .describe(
    `Which platform to post to. One of: ${PLATFORM_LIST}. Defaults to "${DEFAULT_PLATFORM}".`,
  );

/**
 * Build the Bullhorn MCP server for a resolved config. Exposes two write-only
 * tools — the model drafts the text, these post it. Drafting lives in the slash
 * commands, never here. Each tool takes an optional `platform` (X is the only
 * one today) so adding a network never changes the tool surface.
 */
export function createServer(config: BullhornConfig): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  const dryNote = config.dryRun
    ? " The server is in DRY-RUN mode: this will render the post but NOT send it."
    : "";

  server.registerTool(
    "post",
    {
      title: "Post",
      description:
        `Post a single item to one of the user's social accounts. Only call ` +
        `this after the user has explicitly approved the exact text. X posts ` +
        `max ${X_MAX_LENGTH} characters.${dryNote}`,
      inputSchema: {
        text: z
          .string()
          .min(1)
          .describe("The exact post text, already approved by the user."),
        platform: platformParam,
      },
    },
    async ({ text, platform }) => handlePost(config, platform, text),
  );

  server.registerTool(
    "post_thread",
    {
      title: "Post Thread",
      description:
        `Post a thread to one of the user's social accounts as a reply-chain. ` +
        `Only call this after the user has explicitly approved every post. On ` +
        `X each post is max ${X_MAX_LENGTH} characters.${dryNote}`,
      inputSchema: {
        posts: z
          .array(z.string().min(1))
          .min(1)
          .describe(
            "The ordered posts of the thread, each already approved by the user.",
          ),
        platform: platformParam,
      },
    },
    async ({ posts, platform }) => handlePostThread(config, platform, posts),
  );

  return server;
}
