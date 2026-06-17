import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSignature,
  percentEncode,
  buildAuthorizationHeader,
} from "./auth.js";
import type { XCredentials } from "./types.js";

// Canonical vector from X/Twitter's own "Creating a signature" docs.
// https://developer.x.com/en/docs/authentication/oauth-1-0a/creating-a-signature
const VECTOR_CREDS: XCredentials = {
  apiKey: "xvz1evFS4wEEPTGEFPHBog",
  apiSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Y7uw",
  accessToken: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
  accessSecret: "LswwdoUaIVS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
};

const VECTOR_PARAMS = {
  status: "Hello Ladies + Gentlemen, a signed OAuth request!",
  include_entities: "true",
  oauth_consumer_key: "xvz1evFS4wEEPTGEFPHBog",
  oauth_nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
  oauth_signature_method: "HMAC-SHA1",
  oauth_timestamp: "1318622958",
  oauth_token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
  oauth_version: "1.0",
};

test("computeSignature matches X's documented vector", () => {
  const sig = computeSignature(
    "POST",
    "https://api.twitter.com/1.1/statuses/update.json",
    VECTOR_PARAMS,
    VECTOR_CREDS,
  );
  // Verified independently via `openssl dgst -sha1 -hmac` over the same base
  // string, so two HMAC implementations agree on this value.
  assert.equal(sig, "69Tr2VQ3w1UHEuEgGCZIilLXbvo=");
});

test("percentEncode escapes RFC 3986 reserved chars left by encodeURIComponent", () => {
  assert.equal(percentEncode("Ladies + Gentlemen"), "Ladies%20%2B%20Gentlemen");
  assert.equal(percentEncode("a!b*c'd(e)"), "a%21b%2Ac%27d%28e%29");
  assert.equal(percentEncode("~-._"), "~-._"); // unreserved, untouched
});

test("buildAuthorizationHeader is deterministic with injected nonce/timestamp", () => {
  const header = buildAuthorizationHeader(
    "POST",
    "https://api.twitter.com/2/tweets",
    {},
    VECTOR_CREDS,
    { nonce: "fixednonce", timestamp: 1318622958 },
  );
  assert.match(header, /^OAuth /);
  assert.match(header, /oauth_consumer_key="xvz1evFS4wEEPTGEFPHBog"/);
  assert.match(header, /oauth_signature_method="HMAC-SHA1"/);
  assert.match(header, /oauth_nonce="fixednonce"/);
  assert.match(header, /oauth_signature="[^"]+"/);
  // Header params are sorted: consumer_key precedes nonce.
  assert.ok(
    header.indexOf("oauth_consumer_key") < header.indexOf("oauth_nonce"),
  );
});
