# Suggestion relay

A Cloudflare Worker that receives a recipe suggestion from the cook book's `#/suggest` page and opens a GitHub issue labeled `recipe-suggestion`. It also receives suggested changes to an existing recipe (a fix, an improvement, or a tip) from a recipe's "Suggest a change" link, and opens an issue labeled `recipe-change`. The site is static, so this is its only server-side piece. It runs on Cloudflare's free tier.

```text
#/suggest form ──POST──▶ this Worker ──▶ GitHub issue (recipe-suggestion)
                                            │  you add the make-recipe-pr label
                                            ▼
                         .github/workflows/recipe-suggestion.yml
                         Claude + add-recipe skill (unattended) ──▶ draft PR, or questions

#/suggest-change form ──POST──▶ this Worker ──▶ GitHub issue (recipe-change)
                                                  │  you add the make-change-pr label
                                                  ▼
                         .github/workflows/recipe-change.yml
                         Claude + apply-change skill (unattended) ──▶ draft PR, or questions
```

## What it checks

- **Origin:** the request must come from a page listed in `ALLOWED_ORIGINS` (`wrangler.toml`).
- **Size and fields:** JSON only, 40 KB at most. Fields and limits come from `src/utils/suggestion.js` (new recipes) and `src/utils/recipeChange.js` (changes, sent with `type: "change"`), the same files the pages use. Any other `type` is refused.
- **Recipe id:** a change names its recipe by id only, and the id must look like a recipe file's name (lowercase letters, digits and dashes). That is the only visitor text outside a code fence: it goes in the issue title and a link to `src/recipes/<id>.json`.
- **Bots:**
  - A filled honeypot field gets a fake success and opens no issue.
  - Turnstile must pass. With no secret set, every request fails.
  - At most 5 suggestions a minute from one IP address.
- **Untrusted text:**
  - Every field goes inside a code fence that the text can't close.
  - Control characters are dropped.
  - `@` before a name gets a zero-width space after it, so a suggestion can't ping anyone or start the `@claude` workflow. The issue is opened with your token, so that workflow would otherwise treat it as yours.
- **Nothing leaks:** a failed GitHub call logs only the status code, and the visitor sees only `{ ok }`.

## One-time setup

1. **Turnstile:** in the Cloudflare dashboard, go to Turnstile and add a widget.
   - Hostnames: `grfinch.github.io` and `localhost`.
   - Mode: Managed.
   - Note the site key and the secret key.
2. **GitHub token:** create a fine-grained personal access token.
   - Repository access: only `grfinch/recipes`.
   - Permissions: Issues, read and write. Nothing else.
   - Pick an expiry and set a reminder to rotate it.
3. **Deploy the Worker** (from this folder):

   ```bash
   npm ci
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN       # paste the token from step 2
   npx wrangler secret put TURNSTILE_SECRET   # paste the secret key from step 1
   npx wrangler deploy                        # prints the URL, e.g. https://recipes-suggestion-relay.<you>.workers.dev
   ```

4. **Repo variables:** in GitHub, go to Settings → Secrets and variables → Actions → Variables.
   - `SUGGEST_ENDPOINT`: the Worker URL from step 3.
   - `TURNSTILE_SITE_KEY`: the site key from step 1.

   The next deploy of the site shows the form instead of the "suggest on GitHub" link.

5. **Labels:** create them once.

   ```bash
   gh label create recipe-suggestion --color 0E8A16 --description "Suggested from the website"
   gh label create make-recipe-pr   --color 1D76DB --description "Have Claude draft a PR for this suggestion"
   gh label create needs-info       --color FBCA04 --description "Claude needs answers before drafting"
   gh label create pr-opened        --color 5319E7 --description "A draft PR exists for this suggestion"
   gh label create recipe-change    --color C5DEF5 --description "A change to a recipe, suggested from the website"
   gh label create make-change-pr   --color 1D76DB --description "Have Claude draft a PR for this change"
   ```

`CLAUDE_CODE_OAUTH_TOKEN`, which the workflow uses, is already set for `claude.yml`.

## Handling a suggestion

1. GitHub emails you when a `recipe-suggestion` issue is opened. Read it. If it's spam, close it.
2. To have it drafted, add the `make-recipe-pr` label. Only labels you add start the workflow.
3. The workflow ends in one of these:
   - **Drafted:** a draft PR, `suggestion/<issue>-<id>`. It has the changes Claude made, its assumptions, questions for you, and the original submission. CI runs on it. Edit the branch if needed, mark it ready, and merge. Merging closes the issue.
   - **Needs info:** Claude comments its questions and labels the issue `needs-info`. Answer in a comment; only your comments are passed back to Claude. Then add `make-recipe-pr` again.
   - **Rejected** (not a recipe, spam): Claude comments why and closes the issue.
   - **Failed:** the issue gets a link to the run, and the label is removed so you can retry.

## Handling a suggested change

A `recipe-change` issue links to the recipe's file and says what kind of change it is. If it's spam, close it. If it's a good change, add the `make-change-pr` label. The workflow ends the same ways as for a suggestion (drafted, needs info, rejected, or failed), with `make-change-pr` in place of `make-recipe-pr`. A drafted PR is on `change/<issue>-<id>`. It makes the change, and if the visitor gave a name it credits them in the recipe's notes: "Tip from Ana: …" for a tip, or "Thanks to Ana for …" for a fix or improvement. The form promises that credit. Merging the PR closes the issue.

The site sends changes only after this Worker knows about them. **Deploy the Worker (`npx wrangler deploy`) before the site change that added the form**, or every change suggestion fails with "wasn't sent".

## Local development

```bash
npx wrangler dev   # http://localhost:8787
```

- For `wrangler dev`, put secrets in `relay/.dev.vars` (gitignored), one `NAME=value` per line. Use Cloudflare's always-pass test keys: secret `1x0000000000000000000000000000000AA`, site key `1x00000000000000000000AA`.
- Point a test token at a scratch repo by overriding `GITHUB_REPO` there.
- In the app, set `VITE_SUGGEST_ENDPOINT=http://localhost:8787` and the test site key in `.env.local`.

Tests: `npx vitest run relay` from the repo root.
