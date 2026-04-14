# Wedding Invite (React + Vite + VPS API)

Mobile-first SPA invitation with routes `/`, `/protocol` and `/results`.

## Stack

- Frontend: React + Vite
- Backend: Express + SQLite (`server/index.js`)
- Runtime: VPS + nginx + pm2

## Local run

1. Install dependencies:

```bash
npm install
```

2. Run backend API:

```bash
node server/index.js
```

3. Run frontend dev server (Vite proxies `/api` to `127.0.0.1:3001`):

```bash
npm run dev
```

## API

- `POST /api/rsvp`
  - body: `{ "name": "...", "confirmation": "yes" | "no" }`
- `GET /api/results`
- `GET /api/health`

SQLite file is created automatically in `server/data/rsvp.db`.

## Production (VPS)

Recommended nginx layout:

- static files from `dist/`
- `/api/*` proxied to `127.0.0.1:3001`

### Manual deploy on server

```bash
git pull --ff-only origin main
npm ci
npm run build
pm2 restart wedding-api --update-env
```

## GitHub Actions deploy to VPS

Workflow file: `.github/workflows/deploy-vps.yml`

Required repository secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT` (optional, default `22`)
- `VPS_SSH_KEY`
- `VPS_PATH` (example: `/var/www/design-power.github.io`)

After setting secrets, every push to `main` triggers deploy to VPS.

## Frontend env

Optional `.env` value:

- `VITE_API_BASE_URL` — use only if API is on a separate origin.
- leave empty for same-origin nginx setup.
