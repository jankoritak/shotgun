#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "@shotgun/core";
import { createServer } from "./server.js";

/**
 * Entry point for the bundled stdio MCP server. Resolves BYOK config from the
 * environment (injected via the plugin's .mcp.json) and serves over stdio.
 */
async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  // stdout is the MCP channel; diagnostics must go to stderr.
  console.error("[shotgun] fatal:", error);
  process.exit(1);
});

export { createServer } from "./server.js";
