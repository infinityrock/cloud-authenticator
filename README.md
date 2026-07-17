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

Use this when you want “Add secret” to also append the otpauth URI into `src/lib/seedAccounts.ts` on GitHub so the Pages site picks it up after deploy.

1. Create a [fine-grained PAT](https://github.com/settings/personal-access-tokens) (or classic PAT) with **Contents: Read and write** on `infinityrock/cloud-authenticator` (classic scope: `repo`).
2. Open **Git sync**, paste the token, confirm owner/repo/branch/path (defaults point at this repo’s `src/lib/seedAccounts.ts`), and click **Save settings**.
3. Open **Add secret**, fill in the account, leave **Also save to repo** checked, and click **Add & push to repo**.
4. The app adds the account locally immediately, then GETs the file (for `sha`), appends the URI if the secret is new, and PUTs a commit like `Add TOTP seed: Issuer / account`. That commit triggers the existing Pages workflow.

The token stays in browser `localStorage` only — never commit a real token. Adding without a token (or with the checkbox off) still works as a local-only save.

## Git TXT sync

1. Store secrets in a repo as a `.txt` file — one `otpauth://…` URI per line (Authenticator Extension “one-time password” export), or an unencrypted Authenticator JSON backup.
2. Open **Git sync** and paste either:
   - a raw URL (`https://raw.githubusercontent.com/…/authenticator.txt`), or
   - a GitHub/GitLab blob URL (converted to raw automatically).
3. For private repos, add a token with contents read access (same PAT field; stored only in `localStorage`).
4. Click **Fetch & merge**. Matching secrets update metadata; new secrets are added. Local-only accounts are kept.

## Clock sync

**Sync clock** tries Google first via the local Vite `/api/google-time` proxy (dev/preview only — same `generate_204` + `Date` header approach as Authenticator Extension). On static hosting (GitHub Pages), that proxy is unavailable, so it falls back to CORS-friendly public time APIs (WorldTimeAPI, then Akamai). The offset (seconds) is applied when generating TOTP codes. Offsets larger than ±5 minutes are rejected so a badly wrong OS clock is not silently trusted.

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, which builds with Vite (`base: /cloud-authenticator/`) and deploys the `dist` artifact to GitHub Pages.

## Data storage

Accounts and settings (including an optional GitHub PAT) persist in browser `localStorage` under `cloud-authenticator:*`. Seeded secrets live in `src/lib/seedAccounts.ts` and are public on Pages — treat a public deploy as non-private. Do not commit PATs or additional secrets you are not willing to expose.
