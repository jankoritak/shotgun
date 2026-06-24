import { createHmac, randomBytes } from "node:crypto";
import type { XCredentials } from "./types.js";

/**
 * OAuth 1.0a user-context signing for the X API.
 *
 * Implemented from scratch (node:crypto only) so @bullhorn/core stays
 * dependency-free and bundles cleanly. Follows RFC 5849.
 *
 * Note on JSON bodies: X API v2 `POST /2/tweets` sends a JSON body, which is
 * NOT part of the OAuth signature base string — only the oauth_* parameters
 * and any URL query parameters are signed. We therefore never fold the body in.
 */

/**
 * Percent-encode per RFC 3986 (stricter than encodeURIComponent, which leaves
 * `!*'()` unescaped). OAuth 1.0a requires the strict form everywhere.
 */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/** Injected clock/nonce sources, overridable in tests for determinism. */
export interface SigningOptions {
  /** Unix time in seconds. Defaults to now. */
  timestamp?: number;
  /** OAuth nonce. Defaults to 32 random hex chars. */
  nonce?: string;
}

/**
 * Build the `Authorization: OAuth ...` header value for a request.
 *
 * @param method   HTTP method, e.g. "POST".
 * @param url      Full request URL without query string.
 * @param queryParams  URL query parameters (empty for POST /2/tweets).
 * @param creds    The four BYOK credentials.
 */
export function buildAuthorizationHeader(
  method: string,
  url: string,
  queryParams: Record<string, string>,
  creds: XCredentials,
  options: SigningOptions = {},
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: options.nonce ?? randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(options.timestamp ?? Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  const signature = computeSignature(
    method,
    url,
    { ...queryParams, ...oauthParams },
    creds,
  );

  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const entries = Object.keys(headerParams)
    .sort()
    .map(
      (key) =>
        `${percentEncode(key)}="${percentEncode(headerParams[key] as string)}"`,
    );

  return "OAuth " + entries.join(", ");
}

/**
 * Compute the HMAC-SHA1 OAuth signature (base64) over the request.
 * Exported for unit testing against known vectors.
 */
export function computeSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  creds: XCredentials,
): string {
  const paramString = Object.keys(params)
    .map(
      (key): [string, string] => [
        percentEncode(key),
        percentEncode(params[key] as string),
      ],
    )
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  const signingKey =
    percentEncode(creds.apiSecret) + "&" + percentEncode(creds.accessSecret);

  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}
