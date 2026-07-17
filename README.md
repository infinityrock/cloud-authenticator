# Cloud Authenticator

Desktop web app for live TOTP 2FA codes, with local secrets, filtering/grouping, Git TXT sync, and network clock sync. Compatible with [Authenticator Extension](https://github.com/Authenticator-Extension/Authenticator) otpauth TXT exports and unencrypted JSON backups.

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

## Git TXT sync

1. Store secrets in a repo as a `.txt` file — one `otpauth://…` URI per line (Authenticator Extension “one-time password” export), or an unencrypted Authenticator JSON backup.
2. Open **Git sync** and paste either:
   - a raw URL (`https://raw.githubusercontent.com/…/authenticator.txt`), or
   - a GitHub/GitLab blob URL (converted to raw automatically).
3. For private repos, add a token with contents read access (stored only in `localStorage`).
4. Click **Fetch & merge**. Matching secrets update metadata; new secrets are added. Local-only accounts are kept.

## Clock sync

**Sync clock** tries Google first via the local Vite `/api/google-time` proxy (dev/preview only — same `generate_204` + `Date` header approach as Authenticator Extension). On static hosting (GitHub Pages), that proxy is unavailable, so it falls back to CORS-friendly public time APIs (WorldTimeAPI, then Akamai). The offset (seconds) is applied when generating TOTP codes. Offsets larger than ±5 minutes are rejected so a badly wrong OS clock is not silently trusted.

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, which builds with Vite (`base: /cloud-authenticator/`) and deploys the `dist` artifact to GitHub Pages.

## Data storage

Accounts and settings persist in browser `localStorage` under `cloud-authenticator:*`. Seeded demo secrets are for convenience — treat a public deploy as non-private. Do not commit additional real secrets.
