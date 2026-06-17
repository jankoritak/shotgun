---
description: Draft a tweet from your current Claude Code context, then post on approval.
argument-hint: (no argument — drafts from what you just did)
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), mcp__shotgun__post_tweet, mcp__shotgun__post_thread
---

Help the user post a build-in-public tweet about what they're working on **without making
them type it**. They're deep in context and want to shotgun a quality post in seconds.

## 1. Find the angle (no argument expected)
Reconstruct what was just built/fixed/shipped, strongest signal first:
1. **This conversation** — what we actually worked on. Prefer it; it's the richest context.
2. `git log --oneline -5` for recent commits; `git diff --stat HEAD~1` and `git status` for
   what just changed, if the conversation alone is thin.

Pick the *one* interesting thing — a neat trick, an elegant fix, a real perf win, a gotcha
worth sharing, a shipped feature, a milestone. A good tweet makes one point well. If nothing
is genuinely interesting, say so and suggest waiting rather than forcing a bland post.

## 2. Draft 2–3 variants
Each **≤ 280 characters**, in distinct tones:
- **plain** — clear and factual; what changed and why it matters. No fluff.
- **build-in-public** — first person, the journey/what you learned, a little momentum.
- **punchy** — short, high-energy, one sharp opinion or surprising detail.

**Counting:** X counts every URL as 23 chars regardless of length (t.co), and emoji as 2.
Don't shorten links yourself. Aim for **≤ 270** to leave margin. Show each variant's count.

**Voice — sound like a developer talking to developers:**
- No marketing-speak. Ban "Just shipped", "Excited to announce", "game-changer", "🚀🚀🚀".
- 0–1 hashtags, 0–2 emoji. No clickbait. **Never invent metrics, benchmarks, or outcomes** —
  only use numbers actually present in the context.
- Go easy on em-dashes; prefer plain sentences.

## 3. Thread only when it earns it
Default to a **single tweet**. Offer a thread (2–4 tweets) only when there are genuinely
≥ 2 distinct points or a real before→after narrative that won't fit in 280.
- Tweet 1 must **hook and stand alone** (many readers see only it). No "a thread 🧵" preamble
  unless it actually helps.
- Number as `1/`, `2/`, … Show the full thread numbered with per-tweet char counts.

## 4. Pick / edit, then post
- Ask which variant to post, or invite edits. **Wait for explicit approval.**
- Echo back the **exact final text + char count** before posting.
- Only after approval: call `post_tweet` (single) or `post_thread` (thread). Report the
  result; if the server is in DRY-RUN, state plainly that nothing was actually sent.

**Never post without an explicit approval turn from the user.**
