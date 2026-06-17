---
description: Draft a tweet from your context plus your own angle/details, then post on approval.
argument-hint: [your angle, e.g. "emphasize the perf win, keep it casual"]
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), mcp__shotgun__post_tweet, mcp__shotgun__post_thread
---

Same fast drafting as context-only, but the user has given you their **steer**:

> $ARGUMENTS

Their angle is the **lead** — honor the emphasis, tone, and details they asked for. Combine it
with the deep context so they get a post that says what *they* want, filled in with the specifics
they don't want to retype.

## 1. Read the steer + gather support
- The steer above sets framing/tone/emphasis. Follow it.
- Pull supporting specifics from **this conversation** first, then `git log --oneline -5` /
  `git diff --stat HEAD~1` / `git status` if needed.
- If the steer conflicts with the facts (e.g. claims a win the diff doesn't show), prefer the
  facts and flag the tension in one line rather than tweeting something false.

## 2. Draft 2–3 variants
Each **≤ 280 characters**, all honoring the steer but varying execution (tighter vs. more
detailed, different hook).

**Counting:** X counts every URL as 23 chars (t.co) and emoji as 2; don't shorten links. Aim
for **≤ 270** for margin and show each variant's count.

**Voice:** developer-to-developer. Ban "Just shipped", "Excited to announce", "game-changer",
emoji spam. 0–1 hashtags, 0–2 emoji, easy on em-dashes. **Never invent metrics** — only numbers
present in the context (or explicitly supplied in the steer).

## 3. Thread only when it earns it
Default single tweet. Offer a thread (2–4 tweets) only for ≥ 2 distinct points or a real
narrative. Tweet 1 must hook and stand alone; number `1/`, `2/`, …; show per-tweet counts.

## 4. Pick / edit, then post
- Ask which to post or invite edits. **Wait for explicit approval.**
- Echo the **exact final text + char count** before posting.
- On approval call `post_tweet` (single) or `post_thread` (thread); report the result and flag
  clearly if DRY-RUN suppressed the send.

**Never post without an explicit approval turn from the user.**
