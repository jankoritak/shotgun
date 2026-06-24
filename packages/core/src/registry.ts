import {
  PostValidationError,
  SUPPORTED_PLATFORMS,
} from "./platform.js";
import type { AdapterDeps, PlatformAdapter } from "./platform.js";
import type { BullhornConfig } from "./types.js";
import { XAdapter } from "./x-adapter.js";

/**
 * Resolve a {@link PlatformAdapter} for a platform id. Throws
 * {@link PostValidationError} for an unknown platform so callers (the MCP
 * handlers) can surface it as a tool error rather than crashing.
 */
export function createAdapter(
  platform: string,
  config: BullhornConfig,
  deps: AdapterDeps = {},
): PlatformAdapter {
  switch (platform) {
    case "x":
      return new XAdapter(config, deps);
    default:
      throw new PostValidationError(
        `Unknown platform "${platform}". Supported: ${SUPPORTED_PLATFORMS.join(", ")}.`,
      );
  }
}

/** Platform ids that currently have complete credentials (used by /doctor). */
export function configuredPlatforms(config: BullhornConfig): string[] {
  const out: string[] = [];
  if (config.credentials?.x) out.push("x");
  return out;
}
