# Deployment Guide

## 1. Cloudflare D1

1. Authenticate Wrangler and create a D1 database:

   ```bash
   cd worker
   npm install
   npx wrangler login
   npx wrangler d1 create roaster_app
   ```

2. Copy the generated UUID into `wrangler.toml`:

   ```toml
   [[d1_databases]]
   binding = "roaster_app"         # exposed as env.roaster_app in the Worker
   database_name = "roaster_app"
   database_id = "<UUID FROM wrangler d1 create>"
   ```

3. Seed the schema/data locally (or use `--remote` to seed the Cloudflare-hosted DB):

   ```bash
   npm run migrate
   # remote example
   wrangler d1 execute roaster_app --remote --file migrations/001_create_tables.sql
   wrangler d1 execute roaster_app --remote --file migrations/002_seed_shoots.sql
   ```

## 2. Cloudflare Worker API

1. Update `wrangler.toml` (already provided) with:

   ```toml
   name = "roaster-worker"
   main = "worker/index.ts"
   compatibility_date = "2024-11-06"

   [vars]
   ALLOWED_ORIGINS = "http://localhost:3000,https://your-pages-domain.pages.dev"
   ```

2. Develop locally:

   ```bash
   # local/miniflare
   npx wrangler dev --local --persist-to .wrangler/state

   # remote preview (uses Cloudflare edge + real D1 bindings)
   npx wrangler dev --remote
   ```

3. Deploy:

   ```bash
   npm run deploy
   ```

4. Copy the deployed Worker URL (e.g. `https://roaster-worker.<account>.workers.dev`) for the frontend environment variable.

5. CI/CD with rollback

   - Create GitHub Secrets:
     - `CLOUDFLARE_API_TOKEN` with permissions for Workers and D1
     - `CLOUDFLARE_ACCOUNT_ID`
     - `PROD_WORKER_URL` and `PROD_PAGES_URL` for health checks and backups
   - On push to `main`, `.github/workflows/worker-deploy.yml` runs tests and deploys the Worker.
   - Roll back by reverting to a previous commit and pushing to `main`.

## 3. Cloudflare Pages (Next.js Frontend)

1. Configure environment variables in Pages → Settings → Environment Variables:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_BASE_URL` | Worker URL from Section 2 |

2. Build settings:

   | Setting | Value |
   | --- | --- |
   | Build command | `npm run build` |
   | Build directory | `.next` |
   | Node version | `18.x` or `20.x` |

   (Pages automatically runs `npm install` before the build.)

3. Deploy either by connecting the Git repo or via `wrangler pages deploy` after running `npm run build`.

4. CI/CD

   - `.github/workflows/cloudflare-pages-deploy.yml` triggers the Pages Deploy Hook on each push to `main`.
   - Set `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` secret in GitHub.

## 4. Connect Frontend & Backend

- Ensure `ALLOWED_ORIGINS` lists both local dev (`http://localhost:3000`) and the production Pages hostname (e.g. `https://roaster.pages.dev`).
- Set `NEXT_PUBLIC_API_BASE_URL` in every Pages environment (Production + Preview) so the frontend talks to the correct Worker.
- For local dev, create `frontend/.env.local` with:
  ```
  NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8787
  ```

## 5. Validation Checklist

- [ ] `npm run migrate` completes without errors (locally and remotely).
- [ ] `wrangler dev --remote` returns valid responses for:
  - `GET /api/shoots`
  - `POST /api/shoots`
  - `GET /api/expenses`, `/api/payments`, `/api/vacations`, `/api/master-data`
  - `POST /api/roaster-generate?month=&year=`
  - `GET /api/summary?month=&year=`
- [ ] Frontend pages (`/shoots`, `/expenses`, `/payments`, `/vacations`, `/master-data`, `/roaster`, `/summary`) render and perform CRUD operations.
- [ ] Smart roaster grid highlights BOOKED/VACATION/CONFLICT and exports CSV/Excel.
- [ ] Toast notifications display success/error feedback.
- [ ] Mobile layout verified in responsive mode.

## 6. Network and Security

- TLS is provided by Cloudflare; enable HSTS (already configured in `frontend/_headers`).
- Restrict CORS to your Pages domains by updating `ALLOWED_ORIGINS` in `wrangler.toml`.
- Set a custom domain for Pages and update DNS in Cloudflare Dashboard.
- Use Cloudflare Firewall to restrict API paths if needed.

## 7. Backups and Monitoring

- Weekly backups: `.github/workflows/backup.yml` exports core API JSON and stores them as workflow artifacts.
- Health checks: `.github/workflows/health-check.yml` pings `PROD_WORKER_URL/api/health` and the Pages homepage.
- Metrics endpoint: `GET /api/metrics` shows basic counts for API usage.

## 8. Smoke Tests

- After deploy, open the Pages URL and verify:
  - Login works and session is issued
  - CRUD flows on Shoots/Expenses/Payments/Vacations/Master Data
  - Summary pages render without errors
  - CSV export buttons work

## 9. Rollback

- Revert to a previous commit on `main` and push; Actions redeploy the older version.
- For Pages, select a previous deployment in Cloudflare Pages and promote it.

