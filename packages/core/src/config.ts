import type { ShotgunConfig, XCredentials } from "./types.js";

/** Environment variable names for the four BYOK credentials. */
export const CREDENTIAL_ENV_KEYS = {
  apiKey: "SHOTGUN_X_API_KEY",
  apiSecret: "SHOTGUN_X_API_SECRET",
  accessToken: "SHOTGUN_X_ACCESS_TOKEN",
  accessSecret: "SHOTGUN_X_ACCESS_SECRET",
} as const satisfies Record<keyof XCredentials, string>;

/** Environment variable that forces dry-run regardless of credentials. */
export const DRY_RUN_ENV_KEY = "SHOTGUN_DRY_RUN";

type Env = Record<string, string | undefined>;

/** Names of the credential env vars that are missing or empty. */
export function missingCredentialKeys(env: Env): string[] {
  return Object.values(CREDENTIAL_ENV_KEYS).filter((key) => {
    const value = env[key];
    return value === undefined || value.trim() === "";
  });
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const v = value.trim().toLowerCase();
  if (v === "" ) return undefined;
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return undefined;
}

/**
 * Resolve runtime config from environment.
 *
 * Dry-run rules (see PLAN §4):
 *  - Credentials are only carried when ALL four are present and non-empty.
 *  - Dry-run is forced ON whenever credentials are incomplete — we physically
 *    cannot sign a request, so we never pretend we can.
 *  - When credentials ARE complete, SHOTGUN_DRY_RUN decides: defaults to OFF
 *    (live), but an explicit truthy value keeps it in dry-run for safe demos.
 */
export function loadConfig(env: Env = process.env): ShotgunConfig {
  const missing = missingCredentialKeys(env);
  const hasCredentials = missing.length === 0;

  const explicit = parseBoolean(env[DRY_RUN_ENV_KEY]);
  const dryRun = hasCredentials ? (explicit ?? false) : true;

  if (!hasCredentials) {
    return { dryRun };
  }

  const credentials: XCredentials = {
    apiKey: env[CREDENTIAL_ENV_KEYS.apiKey] as string,
    apiSecret: env[CREDENTIAL_ENV_KEYS.apiSecret] as string,
    accessToken: env[CREDENTIAL_ENV_KEYS.accessToken] as string,
    accessSecret: env[CREDENTIAL_ENV_KEYS.accessSecret] as string,
  };

  return { credentials, dryRun };
}
