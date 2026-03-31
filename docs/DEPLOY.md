# Deployment Workflow

## GitHub Pages (Static Site)

Deploys from `main` branch. No build step — push to main and it's live.

### Push Workflow
```bash
git add -A && git commit -m "message"
./scripts/push-main.sh   # pull --rebase, then push
```

### Post-Push Verification
1. Wait ~60s for CI to run
2. `git pull --rebase origin main`
3. Read `version.json` — report version

### Version Format
`vYYMMDD.NN H:MMa` — date + daily counter + Austin time.
CI bumps automatically via GitHub Action on every push. **Never bump locally.**

### Post-Push Output Format
- **Main branch:** "Deployed to main — ..." with test URLs
- **Feature branch:** "Pushed to branch `name` (not yet deployed)" with changed files list

## Live URLs

| Environment | URL |
|---|---|
| Custom domain | https://theanimistapothecary.github.io/the-animist-apothecary/ |
| GitHub Pages | https://theanimistapothecary.github.io/the-animist-apothecary/ |
| Resident portal | https://theanimistapothecary.github.io/the-animist-apothecary/residents/ |
| Admin | https://theanimistapothecary.github.io/the-animist-apothecary/spaces/admin/manage.html |
| Public spaces | https://theanimistapothecary.github.io/the-animist-apothecary/spaces/ |
| Payments | https://theanimistapothecary.github.io/the-animist-apothecary/pay/ |
| Repository | https://github.com/theanimistapothecary/the-animist-apothecary |

## Tailwind CSS

After adding new Tailwind classes, run: `npm run css:build`
