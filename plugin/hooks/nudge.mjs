#!/usr/bin/env node
// SessionStart hook for Bullhorn's opt-in "postable?" nudge.
//
// Approach (PLAN §3, option A): inject an instruction into the session context
// — exactly how an output style is delivered — so Claude judges postability
// inline, with full awareness of what was just done, and layers the nudge on
// top of whatever output style is active. No extra LLM call, no separate mode.
//
// Opt-in and OFF by default: only fires when BULLHORN_NUDGE is truthy. Annoying
// = uninstalled, so silence is the default.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const flag = (process.env.BULLHORN_NUDGE ?? "").trim().toLowerCase();
const enabled = ["1", "true", "yes", "on"].includes(flag);
if (!enabled) process.exit(0); // emit nothing -> no context injected

try {
  // nudge-context.md sits next to this script, so resolve from its own dir —
  // robust regardless of cwd or how CLAUDE_PLUGIN_ROOT is set.
  const additionalContext = readFileSync(
    join(import.meta.dirname, "nudge-context.md"),
    "utf8",
  );
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    }),
  );
} catch {
  // Never break a session over a nudge — fail silent.
  process.exit(0);
}
