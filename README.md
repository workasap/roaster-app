# Roaster Control Center

Cloudflare-native production workflow for Cine Flakes Entertainment. The original Excel/R2 process is now a full-stack application backed by **Cloudflare D1**, **Workers**, and **Next.js + Tailwind CSS** with React Query, toast notifications, validation, and a smart roaster generator.

## Project Structure

| Path | Description |
| --- | --- |
| `frontend/` | Next.js 14 (App Router) + Tailwind UI. Pages for Shoots, Expenses, Payments, Vacations, Master Data, Smart Roaster, and Summary. Uses React Query + SWR patterns, toast notifications, and SheetJS for client-side exports. |
| `worker/` | TypeScript Cloudflare Worker with a REST API over D1. Includes CRUD endpoints for every table, a roaster generator, summary aggregation, helpers, and unit tests (Node’s `--test`). |
| `worker/migrations/` | SQL migrations for schema + seed data. Run via Wrangler scripts (local or remote). |

## Local Development

1. **Install dependencies**
   ```bash
   cd worker && npm install
   cd ../frontend && npm install
   ```

2. **Create / seed the D1 database (local)**
   ```bash
   cd worker
   npm run migrate
   ```

3. **Run the Worker**
   ```bash
   # local preview with persistent SQLite
   npx wrangler dev --local --persist-to .wrangler/state

   # or remote preview (requires `wrangler login` and a D1 db id in wrangler.toml)
   npx wrangler dev --remote
   ```

4. **Run the frontend**
   ```bash
   cd frontend
   npm run dev
   ```

   Set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` to the Worker URL (e.g. `http://127.0.0.1:8787` for local, or your Workers.dev hostname for remote).

## Available Scripts

### Worker

| Script | Description |
| --- | --- |
| `npm run dev` | `wrangler dev` |
| `npm run deploy` | `wrangler deploy` |
| `npm run migrate` | Applies `001_create_tables.sql` then `002_seed_shoots.sql` (local db). Add `--remote` manually to run against Cloudflare. |
| `npm run test` | Runs Node unit tests via `tsx --test` (logic + roaster matrix). |

### Frontend

| Script | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server (default http://localhost:3000) |
| `npm run lint` | ESLint (Next.js config) |
| `npm run build` | Production build (Next.js 14). Requires the Worker API to be reachable or mocked. |

## Environment Variables

| Location | Variable | Purpose |
| --- | --- | --- |
| `wrangler.toml` | `ALLOWED_ORIGINS` | Comma-separated origins that may call the API (CORS). |
| `wrangler.toml` | `[[d1_databases]]` | Bind your D1 DB (update `database_id` with `wrangler d1 create`). |
| Frontend | `NEXT_PUBLIC_API_BASE_URL` | Worker base URL (e.g. `https://roaster-worker.your.workers.dev`). |

## Deployment (High Level)

1. `wrangler d1 create roaster_app` → update `wrangler.toml` with the generated `database_id`.
2. `npm run migrate` (local) or `wrangler d1 execute ... --remote` (production) to create tables + seed data.
3. `wrangler deploy` to publish the Worker.
4. Deploy `frontend/` to Cloudflare Pages (root `frontend/`). Use the Next.js preset with build command `npx @cloudflare/next-on-pages@latest`, output `.vercel/output/static`, functions `.vercel/output/functions`. Set `NEXT_PUBLIC_API_BASE_URL` to the Worker URL in Pages environment variables.

Detailed steps, including Cloudflare Pages + Workers + D1 instructions, are available in `DEPLOYMENT.md`.

## Continuous Deployment (Cloudflare Pages + GitHub)

The site is configured for automatic deploys on every push to `main` using Cloudflare Pages (free tier).

1. Cloudflare Pages → Create project → Connect GitHub → select `workasap/roaster-app`.
2. Build settings:
   - Root directory: `frontend`
   - Framework preset: `Next.js`
   - Build command: `npx @cloudflare/next-on-pages@latest`
   - Output directory: `.vercel/output/static`
   - Functions directory: `.vercel/output/functions`
   - Environment variables: `NEXT_PUBLIC_API_BASE_URL=https://<your-worker>.workers.dev`
3. CORS for Worker API: update `ALLOWED_ORIGINS` in `wrangler.toml` to include your Pages domain (e.g. `https://<project>.pages.dev` and any custom domain).
4. Caching & headers: Pages reads `frontend/_headers` and applies long‑term caching for Next static assets while keeping HTML non‑cached.
5. Optional GitHub Actions trigger: add secret `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` and pushes to `main` will also trigger the Pages deploy hook via `.github/workflows/cloudflare-pages-deploy.yml`.

### Verification

1. Make a small UI change in `frontend/` and push to `main`.
2. In Cloudflare Pages → Deployments, confirm a new build started and finished.
3. Open the production URL to verify the change.

### Monitoring & Notifications

- Enable build failure email notifications in the Cloudflare Pages project settings (free).
- GitHub Actions job fails if the deploy hook secret is missing, surfacing errors in the repo’s Actions tab.

### Custom Domains (Free SSL)

1. Add your domain in Cloudflare Pages → Custom domains.
2. Verify DNS and enable Cloudflare’s Universal SSL (free).
3. Add the custom origin to `ALLOWED_ORIGINS` in `wrangler.toml`.


