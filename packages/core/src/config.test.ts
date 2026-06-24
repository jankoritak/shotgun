import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, missingCredentialKeys } from "./config.js";

const FULL_ENV = {
  BULLHORN_X_API_KEY: "ak",
  BULLHORN_X_API_SECRET: "as",
  BULLHORN_X_ACCESS_TOKEN: "at",
  BULLHORN_X_ACCESS_SECRET: "ats",
};

test("no credentials -> dry-run forced on, no credentials carried", () => {
  const config = loadConfig({});
  assert.equal(config.dryRun, true);
  assert.equal(config.credentials?.x, undefined);
  assert.deepEqual(missingCredentialKeys({}).length, 4);
});

test("partial credentials -> still dry-run, reports which are missing", () => {
  const env = { BULLHORN_X_API_KEY: "ak", BULLHORN_X_API_SECRET: "as" };
  const config = loadConfig(env);
  assert.equal(config.dryRun, true);
  assert.equal(config.credentials?.x, undefined);
  assert.deepEqual(missingCredentialKeys(env), [
    "BULLHORN_X_ACCESS_TOKEN",
    "BULLHORN_X_ACCESS_SECRET",
  ]);
});

test("blank-string credential counts as missing", () => {
  const env = { ...FULL_ENV, BULLHORN_X_ACCESS_SECRET: "   " };
  assert.deepEqual(missingCredentialKeys(env), ["BULLHORN_X_ACCESS_SECRET"]);
  assert.equal(loadConfig(env).dryRun, true);
});

test("full credentials -> live by default", () => {
  const config = loadConfig(FULL_ENV);
  assert.equal(config.dryRun, false);
  assert.deepEqual(config.credentials?.x, {
    apiKey: "ak",
    apiSecret: "as",
    accessToken: "at",
    accessSecret: "ats",
  });
});

test("full credentials + explicit DRY_RUN -> dry-run honored", () => {
  for (const truthy of ["1", "true", "yes", "on"]) {
    assert.equal(
      loadConfig({ ...FULL_ENV, BULLHORN_DRY_RUN: truthy }).dryRun,
      true,
      `expected ${truthy} to enable dry-run`,
    );
  }
  for (const falsy of ["0", "false", "no", "off"]) {
    assert.equal(
      loadConfig({ ...FULL_ENV, BULLHORN_DRY_RUN: falsy }).dryRun,
      false,
      `expected ${falsy} to stay live`,
    );
  }
});
