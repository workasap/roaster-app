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

