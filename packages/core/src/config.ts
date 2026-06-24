import type { BullhornConfig, XCredentials } from "./types.js";

/** Environment variable names for X's four BYOK credentials. */
export const X_CREDENTIAL_ENV_KEYS = {
  apiKey: "BULLHORN_X_API_KEY",
  apiSecret: "BULLHORN_X_API_SECRET",
  accessToken: "BULLHORN_X_ACCESS_TOKEN",
  accessSecret: "BULLHORN_X_ACCESS_SECRET",
} as const satisfies Record<keyof XCredentials, string>;

/** Environment variable that forces dry-run regardless of credentials. */
export const DRY_RUN_ENV_KEY = "BULLHORN_DRY_RUN";

type Env = Record<string, string | undefined>;

/**
 * Names of a platform's credential env vars that are missing or empty.
 * Only X exists today; the `platform` arg leaves room for more.
 */
export function missingCredentialKeys(
  env: Env,
  platform: string = "x",
): string[] {
  if (platform !== "x") return [];
  return Object.values(X_CREDENTIAL_ENV_KEYS).filter((key) => {
    const value = env[key];
    return value === undefined || value.trim() === "";
  });
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const v = value.trim().toLowerCase();
  if (v === "") return undefined;
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return undefined;
}

function loadXCredentials(env: Env): XCredentials | undefined {
  if (missingCredentialKeys(env, "x").length > 0) return undefined;
  return {
    apiKey: env[X_CREDENTIAL_ENV_KEYS.apiKey] as string,
    apiSecret: env[X_CREDENTIAL_ENV_KEYS.apiSecret] as string,
    accessToken: env[X_CREDENTIAL_ENV_KEYS.accessToken] as string,
    accessSecret: env[X_CREDENTIAL_ENV_KEYS.accessSecret] as string,
  };
}

/**
 * Resolve runtime config from environment.
 *
 * Dry-run rules (see PLAN §4):
 *  - A platform's credentials are only carried when ALL of them are present.
 *  - Global dry-run is forced ON when NO platform has complete credentials —
 *    we cannot sign any request, so we never pretend we can.
 *  - When at least one platform is configured, BULLHORN_DRY_RUN decides:
 *    defaults to OFF (live), but an explicit truthy value keeps dry-run on for
 *    safe demos. Each adapter independently stays dry-run if ITS creds are
 *    absent, so a configured X can post while an unconfigured platform cannot.
 */
export function loadConfig(env: Env = process.env): BullhornConfig {
  const x = loadXCredentials(env);
  const explicit = parseBoolean(env[DRY_RUN_ENV_KEY]);
  const dryRun = x ? (explicit ?? false) : true;

  return { credentials: { x }, dryRun };
}
