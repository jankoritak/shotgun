---
description: Check your Bullhorn setup — keys present, DRY-RUN status — without posting anything.
argument-hint: (no argument)
allowed-tools: Bash(sh:*)
---

Diagnose the user's Bullhorn configuration. **Do not post anything** and **never print secret
values** — only whether each credential is present.

Run this check (it prints presence, never the secret itself):

```sh
for v in BULLHORN_X_API_KEY BULLHORN_X_API_SECRET BULLHORN_X_ACCESS_TOKEN BULLHORN_X_ACCESS_SECRET; do
  if [ -n "$(printenv "$v")" ]; then echo "$v: present"; else echo "$v: MISSING"; fi
done
echo "BULLHORN_DRY_RUN: ${BULLHORN_DRY_RUN:-(unset)}"
```

Then report a short diagnosis:
- ✅ **Ready to post live** — all four keys present and `BULLHORN_DRY_RUN` is unset/false.
- 🧪 **Dry-run** — explain *why*: either `BULLHORN_DRY_RUN` is truthy, or one+ keys are
  missing (list which). Note that posts will render but not send until resolved.
- For any missing key, point to the README X setup (create an X app with Read+Write,
  export the 4 OAuth 1.0a keys).

Keep it to a tight checklist + one-line verdict. This is the command that answers BYOK's
top support question, so be precise about what's missing and how to fix it.
