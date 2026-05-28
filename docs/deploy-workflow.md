# Deploy workflow

How we ship to theanimistapothecary.com while local development continues.

## The setup

- **Live site:** theanimistapothecary.com — served from `main` via GitHub Pages auto-deploy.
- **Local dev:** `localhost:8080` — runs whatever's checked out, usually `main`.
- **Rule:** every push to `main` is live within ~60 seconds. Treat `main` as production.

## Branch naming

| Prefix | When to use | Example |
|---|---|---|
| `wire/` | Wiring a form, API, or interactive feature | `wire/inquiry-form`, `wire/newsletter` |
| `fix/` | Fixing something already on live | `fix/footer-year`, `fix/about-broken-link` |
| `audit/` | Audit work that produces docs but no shipped change | `audit/live-site-260527` |
| `content/` | Copy / `_content/*.yml` updates only | `content/about-revision` |
| `page/` | Larger redesign of an existing page | `page/sacred-reciprocity-rebuild` |

Branch name is `<prefix>/<short-handle>`. Lowercase, hyphens, no spaces.

## The flow

1. **Local dev stays on `main`** so the localhost server reflects what's live. When you need to make a change that isn't trivially safe to push, branch off `main`:
   ```
   git checkout -b wire/inquiry-form
   ```

2. **Work on the branch.** Localhost will follow whatever branch you have checked out. Switch branches to test the other state.

3. **Merge to `main` when the change is deploy-ready.** Use a non-fast-forward merge to keep the branch visible in history:
   ```
   git checkout main
   git merge --no-ff wire/inquiry-form
   git push origin main
   git branch -d wire/inquiry-form
   ```

4. **Hot-fixes to `main` are OK** while a feature branch is open. Push the fix. Then in your feature branch, `git merge main` to pick up the fix locally so you don't drift.

## What counts as "deploy-ready"

A branch can merge to `main` when:
- The change works in localhost.
- It doesn't break anything else on the site (spot-check the gateway flow: home → book.html → inquiry.html → sacred-reciprocity.html).
- Any new edge function is deployed to Supabase.
- Any new env var / secret is set in Supabase project settings.
- No `console.log`, `TODO`, or commented-out code in shipped files.

## What stays uncommitted

Half-finished work that would break live if pushed. Examples currently sitting untracked:
- `index.html.session-backup` — delete, not a real file.
- `calendar-preview.html`, `js/calendar-booking.js`, `admin/google-connect.html`, `supabase/functions/_shared/google-*.ts`, `supabase/functions/google-oauth-callback/` — in-progress custom-calendar work. Should live on a `wire/custom-calendar` branch, not on `main`.

## Staging / preview

GitHub Pages doesn't preview branches by default. For now, "preview" = localhost + a careful gateway spot-check. If preview deploys become valuable, we'll wire up Cloudflare Pages with branch previews then.
