# Cloud Authenticator

Desktop web app for live TOTP 2FA codes, with local secrets, filtering/grouping, Git TXT sync, optional push of new secrets into `seedAccounts.ts` via a GitHub PAT, and network clock sync. Compatible with [Authenticator Extension](https://github.com/Authenticator-Extension/Authenticator) otpauth TXT exports and unencrypted JSON backups.

**Live site:** https://infinityrock.github.io/cloud-authenticator/

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/cloud-authenticator/`).

Production build:

```bash
npm run build
npm run preview
```

## Save new secrets to the repo (`seedAccounts.ts`)

“Add secret” can also append the otpauth URI into `src/lib/seedAccounts.ts` on GitHub so the Pages site picks it up after deploy.

**Also save to repo** defaults **on**. Owner/repo/branch/path and a classic PAT are hardcoded in the app (`DEFAULT_SEED_REPO` in `src/lib/seedRepoPush.ts`) so no Git sync setup is required. Git sync can still override those values (overrides live in `localStorage`).

Flow when the checkbox is on:

1. The app adds the account locally immediately.
2. It GETs `seedAccounts.ts` (for `sha`), appends the URI if the secret is new, and PUTs a commit like `Add TOTP seed: Issuer / account`.
3. That commit triggers the existing Pages workflow.

Uncheck the box for a local-only save. If you rotate the baked-in token, paste the new PAT in **Git sync** and save.


## Git TXT sync

1. Store secrets in a repo as a `.txt` file — one `otpauth://…` URI per line (Authenticator Extension “one-time password” export), or an unencrypted Authenticator JSON backup.
2. Open **Git sync** and paste either:
   - a raw URL (`https://raw.githubusercontent.com/…/authenticator.txt`), or
   - a GitHub/GitLab blob URL (converted to raw automatically).
3. For private repos, use the same PAT field (pre-filled; override in Git sync if needed).
4. Click **Fetch & merge**. Matching secrets update metadata; new secrets are added. Local-only accounts are kept.

## Clock sync

**Sync clock** tries Google first via the local Vite `/api/google-time` proxy (dev/preview only — same `generate_204` + `Date` header approach as Authenticator Extension). On static hosting (GitHub Pages), that proxy is unavailable, so it falls back to CORS-friendly public time APIs (WorldTimeAPI, then Akamai). The offset (seconds) is applied when generating TOTP codes. Offsets larger than ±5 minutes are rejected so a badly wrong OS clock is not silently trusted.

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, which builds with Vite (`base: /cloud-authenticator/`) and deploys the `dist` artifact to GitHub Pages.

## Data storage

Accounts and settings persist in browser `localStorage` under `cloud-authenticator:*`. A default GitHub PAT is also baked into the JS bundle for zero-config seed pushes — treat the public Pages deploy as non-private and rotate that token if it is compromised. Seeded secrets in `src/lib/seedAccounts.ts` are likewise public on Pages.
