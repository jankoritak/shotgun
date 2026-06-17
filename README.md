# Shotgun

Post to X (Twitter) from inside Claude Code. Draft a tweet from your current session context, review it, approve it, post it. Nothing posts without your approval.

OSS, bring-your-own-keys, write-only, local-only. No backend. The plugin runs in your Claude Code and posts to your own X account with your own credentials, at about $0.01 per post.

## Requirements

- Node 20+ on your PATH. The plugin runs its bundled server with `node`, so this is required for both install methods (pnpm is needed only for the source install).
- An X *developer* account ([developer.x.com](https://developer.x.com)), not just a regular X account.
- A small amount of API credits on that account. Posting is pay-per-use, about $0.01 per post.

## X setup (one time)

Order matters. You need four OAuth 1.0a credentials:

1. Create a Project and an App.
2. In the App's **User authentication settings**, set permissions to **Read and Write**. Do this first.
3. Generate the four values: **API Key**, **API Secret**, **Access Token**, **Access Token Secret**. Generate the Access Token and Secret *after* step 2, or they stay read-only and posting fails with a 403.
4. Add billing/credits to the account, or posting fails with a 402.

## Install

From the marketplace:

```
/plugin marketplace add jankoritak/shotgun
/plugin install shotgun
```

From source:

```bash
pnpm install && pnpm build      # bundles the MCP server into plugin/bin/
claude --plugin-dir ./plugin
```

## Configure (BYOK)

Export the four keys in the shell that launches Claude Code:

```bash
export SHOTGUN_X_API_KEY="..." SHOTGUN_X_API_SECRET="..."
export SHOTGUN_X_ACCESS_TOKEN="..." SHOTGUN_X_ACCESS_SECRET="..."
```

Keys are read from the environment only. They are never written to disk and never committed.

Dry-run: with no keys set, or with `SHOTGUN_DRY_RUN=1`, Shotgun renders exactly what would post without calling X. It falls back to dry-run automatically when any key is missing.

## Commands

| Command | What it does |
|---|---|
| `/shotgun:tweet-this` | Drafts a tweet from your current session and repo context. No argument. |
| `/shotgun:tweet-suggest <angle>` | Same context, steered by your angle or details. |
| `/shotgun:doctor` | Reports which keys are present and the dry-run status. Never posts, never prints secrets. |

Both drafting commands produce 2-3 variants (max 280 chars, developer voice, minimal hashtags). You pick or edit one, and it posts only after you explicitly approve. Longer content posts as a numbered reply-chain thread.

Optional nudge: set `SHOTGUN_NUDGE=1` and Claude proactively flags tweetable moments inline ("that looked tweetable, `/shotgun:tweet-this`?"). Off by default. It only suggests, never drafts or posts on its own.

## Troubleshooting

- **403 `oauth1-permissions`**: the access tokens are read-only. Set the App to Read and Write, then regenerate the Access Token and Secret.
- **402 `CreditsDepleted`**: the account has no API credits. Add billing in the developer portal.
- **Renders instead of posting**: a key is missing or `SHOTGUN_DRY_RUN` is set. Run `/shotgun:doctor` to see which.

## How it works

A small Turborepo monorepo:

- `@shotgun/core`: X API v2 client, OAuth 1.0a signing, config and dry-run resolution.
- `@shotgun/mcp-server`: a stdio MCP server exposing `post_tweet` and `post_thread`.
- `plugin/`: the slash commands, the opt-in nudge hook, and a single self-contained bundled server.

The model drafts the text. The server only posts. Drafting never lives in the server.

## Security

BYOK means your keys, your account, your cents. The plugin author never sees your credentials. Keys live only in your environment. Rotate them in the X portal if they are ever exposed.

## License

MIT, © Jan Koriťák
